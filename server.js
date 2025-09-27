const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();

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

// API Routes

// Avvia server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server attivo su porta ${PORT}`);
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
        // Aggregation per ottenere solo l'ultima posizione di ogni veicolo
        const latestPositions = await VehiclePosition.aggregate([
            // Ordina per timestamp decrescente
            { $sort: { timestamp: -1 } },
            // Raggruppa per vehicleId e prendi il primo (più recente)
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

        // Formato per frontend
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