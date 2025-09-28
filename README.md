# waste-management
URL:  
https://waste-management-vqgq.onrender.com

add truck endpoint:
POST: https://waste-management-vqgq.onrender.com/api/gps-data

sample JSON:
{
  "vehicleId": "truck002",
  "coordinates": [15.0850, 37.5090],
  "speed": 20.0,
  "routeSegment": "piazza_duomo"
}

or

{
  "vehicleId": "truck001",
  "coordinates": [15.0840, 37.5085],
  "speed": 30.0
}

visualize all truck endpoint
GET: https://waste-management-vqgq.onrender.com/api/vehicles

visualize one truck endpoint
GET: https://waste-management-vqgq.onrender.com/api/vehicles/truck001