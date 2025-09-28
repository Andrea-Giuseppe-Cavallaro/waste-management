const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');

const app = express();

// Middleware
app.use(express.json());
app.use(require('cors')());

// Connessione MongoDB Atlas
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connesso a MongoDB Atlas'))
    .catch(err => console.error('Errore connessione:', err));

// Schema per GPS dei veicoli
const VehiclePositionSchema = new mongoose.Schema({
    vehicleId: { type: String, required: true },
    location: {
        type: { type: String, default: 'Point' },
        coordinates: { type: [Number], required: true } // [lng, lat]
    },
    timestamp: { type: Date, default: Date.now },
    speed: Number,
    routeSegment: String
});

// Indice geospaziale
VehiclePositionSchema.index({ location: '2dsphere' });

const VehiclePosition = mongoose.model('VehiclePosition', VehiclePositionSchema);

// Creazione server HTTP e Socket.IO
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" } // in produzione puoi limitare l'origine
});

// Gestione connessioni Socket.IO
io.on("connection", (socket) => {
    console.log("Client connesso:", socket.id);
});

// POST: Ricevi dati GPS dal camion
app.post('/api/gps-data', async (req, res) => {
    try {
        const { vehicleId, coordinates, speed, routeSegment } = req.body;

        const position = new VehiclePosition({
            vehicleId,
            location: { coordinates }, // [lng, lat]
            speed,
            routeSegment
        });

        await position.save();

        // Invio aggiornamento in tempo reale a tutti i client
        io.emit("vehicle-update", {
            vehicleId,
            lat: coordinates[1],
            lng: coordinates[0],
            speed,
            routeSegment,
            timestamp: position.timestamp
        });

        res.json({
            message: 'Dati GPS salvati con successo',
            id: position._id
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET: Ottieni tutte le posizioni
app.get('/api/vehicles', async (req, res) => {
    try {
        const positions = await VehiclePosition.find().sort({ timestamp: -1 });
        res.json(positions);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET: Posizioni di un veicolo specifico
app.get('/api/vehicles/:vehicleId', async (req, res) => {
    try {
        const positions = await VehiclePosition
            .find({ vehicleId: req.params.vehicleId })
            .sort({ timestamp: -1 });
        res.json(positions);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Serve file statici per la dashboard
app.use(express.static('public'));

// GET: Dati per mappa (solo ultima posizione per veicolo)
app.get('/api/map-data', async (req, res) => {
    try {
        const latestPositions = await VehiclePosition.aggregate([
            { $sort: { timestamp: -1 } },
            {
                $group: {
                    _id: "$vehicleId",
                    vehicleId: { $first: "$vehicleId" },
                    location: { $first: "$location" },
                    speed: { $first: "$speed" },
                    timestamp: { $first: "$timestamp" },
                    routeSegment: { $first: "$routeSegment" }
                }
            }
        ]);

        const mapData = latestPositions.map(pos => ({
            vehicleId: pos.vehicleId,
            lat: pos.location.coordinates[1],
            lng: pos.location.coordinates[0],
            speed: pos.speed,
            timestamp: pos.timestamp,
            routeSegment: pos.routeSegment
        }));

        res.json(mapData);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Avvio server con Socket.IO
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server attivo su porta ${PORT}`);
});
