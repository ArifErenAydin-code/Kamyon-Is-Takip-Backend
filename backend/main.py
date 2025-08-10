from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import requests
from datetime import datetime, timedelta
from typing import List, Optional
from pydantic import BaseModel
from config import settings
import logging

# Logging ayarları
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Position(BaseModel):
    latitude: float
    longitude: float
    speed: float
    course: Optional[float]
    altitude: Optional[float]
    address: Optional[str]
    timestamp: datetime

class Vehicle(BaseModel):
    id: int
    name: str
    uniqueId: str
    status: str
    lastUpdate: datetime
    position: Optional[Position] = None
    fuel: Optional[float] = None
    ignition: Optional[bool] = None
    motion: Optional[bool] = None

class Event(BaseModel):
    id: int
    type: str
    serverTime: datetime
    deviceId: int
    positionId: int
    geofenceId: Optional[int] = None
    maintenanceId: Optional[int] = None
    attributes: dict

class TraccarAPI:
    def __init__(self):
        self.base_url = settings.TRACCAR_URL
        self.session = requests.Session()
        logger.info(f"TraccarAPI initialized with URL: {self.base_url}")
        
    def login(self):
        try:
            logger.info("Attempting to login to Traccar API...")
            logger.info(f"Using URL: {self.base_url}")
            logger.info(f"Using email: {settings.TRACCAR_USER}")
            
            # Önce server bilgisini alalım
            server_response = self.session.get(
                f"{self.base_url}/api/server",
                headers={
                    "Accept": "*/*",
                    "Accept-Language": "tr,en;q=0.9",
                    "Content-Type": "application/json",
                    "Sec-Fetch-Mode": "cors",
                    "Sec-Fetch-Site": "same-origin",
                    "Referer": f"{self.base_url}/login",
                    "User-Agent": "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36 Edg/135.0.0.0"
                },
                verify=False
            )
            
            logger.info(f"Server check response status code: {server_response.status_code}")
            if server_response.ok:
                logger.info("Server check successful, proceeding with login...")
                
                # Şimdi session endpoint'ine POST isteği yapalım
                login_response = self.session.post(
                    f"{self.base_url}/api/session",
                    data={
                        "email": settings.TRACCAR_USER,
                        "password": settings.TRACCAR_PASS
                    },
                    headers={
                        "Accept": "*/*",
                        "Accept-Language": "tr,en;q=0.9",
                        "Content-Type": "application/x-www-form-urlencoded",
                        "Sec-Fetch-Mode": "cors",
                        "Sec-Fetch-Site": "same-origin",
                        "Referer": f"{self.base_url}/login",
                        "User-Agent": "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36 Edg/135.0.0.0"
                    },
                    verify=False
                )
                
                logger.info(f"Login response status code: {login_response.status_code}")
                if not login_response.ok:
                    logger.error(f"Login failed. Status code: {login_response.status_code}")
                    logger.error(f"Response text: {login_response.text}")
                    return False
                
                # Session cookie'lerini kontrol edelim
                cookies = self.session.cookies.get_dict()
                logger.info(f"Current session cookies: {cookies}")
                
                # Session'ı doğrulayalım
                session_check = self.session.get(
                    f"{self.base_url}/api/session",
                    headers={
                        "Accept": "application/json, text/plain, */*",
                        "Accept-Language": "tr,en;q=0.9",
                        "Sec-Fetch-Mode": "cors",
                        "Sec-Fetch-Site": "same-origin",
                        "Referer": f"{self.base_url}/",
                        "User-Agent": "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36 Edg/135.0.0.0"
                    },
                    verify=False
                )
                
                logger.info(f"Session verification status code: {session_check.status_code}")
                return session_check.ok
            
            logger.error("Server check failed")
            return False
            
        except Exception as e:
            logger.error(f"Login error: {str(e)}")
            return False

    def get_devices(self):
        try:
            logger.info("Fetching devices from Traccar API...")
            response = self.session.get(
                f"{self.base_url}/api/devices",
                headers={
                    "Accept": "application/json, text/plain, */*",
                    "Accept-Language": "tr,en;q=0.9",
                    "Sec-Fetch-Mode": "cors",
                    "Sec-Fetch-Site": "same-origin",
                    "Referer": f"{self.base_url}/",
                    "User-Agent": "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36 Edg/135.0.0.0"
                },
                verify=False
            )
            if response.ok:
                devices = response.json()
                logger.info(f"Successfully fetched {len(devices)} devices")
                return devices
            logger.error(f"Failed to fetch devices. Status code: {response.status_code}")
            logger.error(f"Response text: {response.text}")
            return []
        except Exception as e:
            logger.error(f"Error fetching devices: {str(e)}")
            return []

    def get_positions(self, device_id=None, from_date=None, to_date=None):
        try:
            logger.info("Fetching positions from Traccar API...")
            
            # Query parametrelerini hazırla
            params = {}
            if device_id:
                params['deviceId'] = device_id
            if from_date:
                params['from'] = from_date.isoformat() + 'Z'
            if to_date:
                params['to'] = to_date.isoformat() + 'Z'
            
            logger.info(f"Fetching positions with params: {params}")
            
            response = self.session.get(
                f"{self.base_url}/api/positions",
                params=params,
                headers={
                    "Accept": "application/json, text/plain, */*",
                    "Accept-Language": "tr,en;q=0.9",
                    "Sec-Fetch-Mode": "cors",
                    "Sec-Fetch-Site": "same-origin",
                    "Referer": f"{self.base_url}/",
                    "User-Agent": "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36 Edg/135.0.0.0"
                },
                verify=False
            )
            if response.ok:
                positions = response.json()
                logger.info(f"Successfully fetched {len(positions)} positions")
                return positions
            logger.error(f"Failed to fetch positions. Status code: {response.status_code}")
            logger.error(f"Response text: {response.text}")
            return []
        except Exception as e:
            logger.error(f"Error fetching positions: {str(e)}")
            return []

    def get_device_positions(self, device_id: int, from_time: datetime = None):
        try:
            if from_time is None:
                from_time = datetime.now() - timedelta(days=1)
            params = {
                'deviceId': device_id,
                'from': from_time.isoformat() + 'Z'
            }
            response = self.session.get(f"{self.base_url}/api/positions", params=params)
            return response.json() if response.ok else []
        except:
            return []

    def get_events(self, device_id: int = None, from_time: datetime = None, event_type: str = None):
        try:
            params = {}
            if device_id:
                params['deviceId'] = device_id
            if from_time:
                params['from'] = from_time.isoformat() + 'Z'
            if event_type:
                params['type'] = event_type
            response = self.session.get(f"{self.base_url}/api/events", params=params)
            return response.json() if response.ok else []
        except:
            return []

@app.get("/")
def read_root():
    return {"message": "Araç Takip Sistemi API"}

@app.get("/vehicles", response_model=List[Vehicle])
def get_vehicles():
    api = TraccarAPI()
    if not api.login():
        raise HTTPException(status_code=401, detail="Traccar bağlantısı başarısız")
    
    devices = api.get_devices()
    positions = api.get_positions()
    
    vehicles = []
    for device in devices:
        position = next(
            (p for p in positions if p["deviceId"] == device["id"]), 
            None
        )
        
        position_model = None
        if position:
            position_model = Position(
                latitude=position["latitude"],
                longitude=position["longitude"],
                speed=position["speed"],
                course=position.get("course"),
                altitude=position.get("altitude"),
                address=position.get("address"),
                timestamp=datetime.fromtimestamp(position["fixTime"]/1000)
            )

        vehicle = Vehicle(
            id=device["id"],
            name=device["name"],
            uniqueId=device["uniqueId"],
            status=device["status"],
            lastUpdate=datetime.fromtimestamp(device["lastUpdate"]/1000) if device.get("lastUpdate") else datetime.now(),
            position=position_model,
            fuel=position.get("attributes", {}).get("fuel"),
            ignition=position.get("attributes", {}).get("ignition"),
            motion=position.get("attributes", {}).get("motion")
        )
        vehicles.append(vehicle)
    
    return vehicles

@app.get("/vehicles/{vehicle_id}")
def get_vehicle(vehicle_id: int):
    api = TraccarAPI()
    if not api.login():
        raise HTTPException(status_code=401, detail="Traccar bağlantısı başarısız")
    
    devices = api.get_devices()
    positions = api.get_positions()
    
    device = next((d for d in devices if d["id"] == vehicle_id), None)
    if not device:
        raise HTTPException(status_code=404, detail="Araç bulunamadı")
    
    position = next((p for p in positions if p["deviceId"] == vehicle_id), None)
    
    position_model = None
    if position:
        position_model = Position(
            latitude=position["latitude"],
            longitude=position["longitude"],
            speed=position["speed"],
            course=position.get("course"),
            altitude=position.get("altitude"),
            address=position.get("address"),
            timestamp=datetime.fromtimestamp(position["fixTime"]/1000)
        )

    return Vehicle(
        id=device["id"],
        name=device["name"],
        uniqueId=device["uniqueId"],
        status=device["status"],
        lastUpdate=datetime.fromtimestamp(device["lastUpdate"]/1000) if device.get("lastUpdate") else datetime.now(),
        position=position_model,
        fuel=position.get("attributes", {}).get("fuel"),
        ignition=position.get("attributes", {}).get("ignition"),
        motion=position.get("attributes", {}).get("motion")
    )

@app.get("/vehicles/{vehicle_id}/history")
def get_vehicle_history(vehicle_id: int, hours: int = 24):
    api = TraccarAPI()
    if not api.login():
        raise HTTPException(status_code=401, detail="Traccar bağlantısı başarısız")
    
    from_time = datetime.now() - timedelta(hours=hours)
    positions = api.get_device_positions(vehicle_id, from_time)
    
    return [Position(
        latitude=p["latitude"],
        longitude=p["longitude"],
        speed=p["speed"],
        course=p.get("course"),
        altitude=p.get("altitude"),
        address=p.get("address"),
        timestamp=datetime.fromtimestamp(p["fixTime"]/1000)
    ) for p in positions]

@app.get("/vehicles/{vehicle_id}/events")
def get_vehicle_events(vehicle_id: int, hours: int = 24, event_type: str = None):
    api = TraccarAPI()
    if not api.login():
        raise HTTPException(status_code=401, detail="Traccar bağlantısı başarısız")
    
    from_time = datetime.now() - timedelta(hours=hours)
    events = api.get_events(device_id=vehicle_id, from_time=from_time, event_type=event_type)
    
    return [Event(
        id=e["id"],
        type=e["type"],
        serverTime=datetime.fromisoformat(e["serverTime"].replace('Z', '+00:00')),
        deviceId=e["deviceId"],
        positionId=e["positionId"],
        geofenceId=e.get("geofenceId"),
        maintenanceId=e.get("maintenanceId"),
        attributes=e.get("attributes", {})
    ) for e in events]

@app.get("/vehicles/{vehicle_id}/positions")
def get_vehicle_positions(vehicle_id: int, days: int = 1):
    api = TraccarAPI()
    if not api.login():
        raise HTTPException(status_code=401, detail="Traccar bağlantısı başarısız")
    
    # Son X günlük veriyi al
    from_date = datetime.now() - timedelta(days=days)
    positions = api.get_positions(device_id=vehicle_id, from_date=from_date)
    
    return [Position(
        latitude=p["latitude"],
        longitude=p["longitude"],
        speed=p["speed"],
        course=p.get("course"),
        altitude=p.get("altitude"),
        address=p.get("address"),
        timestamp=datetime.fromtimestamp(p["fixTime"]/1000)
    ) for p in positions]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 