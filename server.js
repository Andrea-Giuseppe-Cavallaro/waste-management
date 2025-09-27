const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
app.use(express.json());

// Connessione MongoDB Atlas
mongoose.connect(process.env.MONGODB_URI);

// Schema per posizioni GPS
const VehiclePositionSchema = new mongoose.Schema({
    vehicleId: String,
    location: {
        type: { type: String, default: 'Point' },
        coordinates: [Number] // [lng, lat]
    },
    timestamp: { type: Date, default: Date.now },
    speed: Number
});

const VehiclePosition = mongoose.model('VehiclePosition', VehiclePositionSchema);

// API endpoint per ricevere dati GPS
app.post('/api/gps-data', async (req, res) => {
    try {
        const { vehicleId, coordinates, speed } = req.body;

        const position = new VehiclePosition({
            vehicleId,
            location: { coordinates },
            speed
        });

        await position.save();
        res.json({ message: 'GPS data saved successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(process.env.PORT, () => {
    console.log(`Server running on port ${process.env.PORT}`);
});