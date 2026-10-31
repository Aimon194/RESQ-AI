# 🚨 RESQ AI

### AI-Powered Autonomous Disaster Response & Flood Rescue Coordination Platform

RESQ AI is an intelligent disaster response platform designed to improve emergency coordination during floods and other natural disasters.

The platform connects **citizens in danger** with an **AI-powered emergency response dashboard**. Users can send SOS alerts with their location and voice messages, while multiple AI agents automatically analyze incidents, identify duplicate reports, assess risks, recommend evacuation routes, allocate rescue resources, and assist emergency responders.

---

## 🌊 The Problem

During floods and large-scale disasters, emergency response teams face several challenges:

- Large numbers of SOS requests arriving simultaneously.
- Difficulty identifying the most critical emergencies.
- Duplicate emergency reports.
- Continuously changing locations of affected people.
- Limited rescue teams and resources.
- Flood conditions changing rapidly.
- Difficulty identifying safe evacuation routes.
- Poor or unstable internet connectivity.
- Situations where a person's mobile phone becomes separated from them.

Traditional emergency coordination systems often require significant manual effort to collect, analyze, prioritize, and assign emergency requests.

**RESQ AI aims to automate and assist these processes using AI agents, geospatial analysis, and real-time communication.**

---

# ✨ Key Features

## 📱 Citizen SOS Mobile Application

The mobile application allows users to:

- 🚨 Send an SOS alert with a single tap.
- 🎙️ Record and send emergency voice messages.
- 📝 Add optional text descriptions.
- 📍 Automatically capture GPS location.
- 🔄 Update location periodically when tracking is enabled.
- 🗺️ View safety and evacuation information.
- ⚠️ Report flood hazards.
- 👥 Submit reports about missing or endangered people.
- 📶 Queue emergency information when internet connectivity is unstable.
- 🔁 Synchronize queued information when connectivity returns.

---

## 🖥️ AI Disaster Response Dashboard

The emergency response dashboard provides:

- 📡 Real-time SOS alerts.
- 🗺️ Interactive live incident map.
- 📍 Original and latest known user locations.
- 🧭 User movement tracking.
- 🌊 Flood hazard visualization.
- 🚑 Rescue team monitoring.
- 🏠 Shelter information.
- 🚨 Incident prioritization.
- 🔎 Duplicate incident detection.
- 🧠 AI agent activity monitoring.
- 🚧 Evacuation route recommendations.
- 📦 Rescue resource allocation.
- 👁️ Witness report management.
- 📜 Complete incident timelines and audit history.

---

# 🤖 Multi-Agent AI System

RESQ AI uses multiple specialized AI agents, each responsible for a different part of the emergency response workflow.

## 1️⃣ SOS Triage Agent

Analyzes incoming SOS messages and identifies:

- Emergency type.
- Severity.
- Reported injuries.
- Number of people affected.
- Medical requirements.
- Mobility concerns.
- Immediate hazards.

The agent generates a structured incident summary and recommends an initial priority level.

---

## 2️⃣ Duplicate Detection Agent

Identifies:

- Duplicate SOS submissions.
- Network retry duplicates.
- Related emergency reports.
- Similar incidents occurring nearby.

It uses a combination of:

- Incident identifiers.
- Location proximity.
- Time proximity.
- Text similarity.
- Semantic similarity.

Potential duplicates are flagged instead of automatically merging unrelated incidents.

---

## 3️⃣ Location & Movement Analysis Agent

Processes periodic location updates and:

- Tracks movement history.
- Calculates displacement.
- Evaluates GPS accuracy.
- Detects stale locations.
- Identifies significant movement.
- Monitors changes in risk zones.

The system preserves the **original SOS location** separately from the **latest known location**.

---

## 4️⃣ Flood Risk & Prediction Agent

Analyzes available flood-related data such as:

- Rainfall.
- Weather conditions.
- River levels.
- Flood hazard maps.
- Terrain elevation.
- Drainage networks.
- Observed inundation data.

The system can perform different levels of analysis depending on available data.

### Level 1 — Flood Hazard Mapping

Uses existing flood hazard data to identify potentially affected locations.

### Level 2 — Terrain Analysis

Analyzes:

- Elevation.
- Low-lying areas.
- Drainage paths.
- Potential water flow directions.

### Level 3 — Advanced Hydraulic Modeling

Supports integration with scientific flood and hydraulic modeling systems when sufficient data is available.

All predictions include information about:

- Data sources.
- Data freshness.
- Assumptions.
- Uncertainty.
- Model type.

---

## 5️⃣ Evacuation Planning Agent

The evacuation agent:

- Identifies candidate shelters.
- Generates possible routes.
- Avoids known flood zones.
- Considers road closures.
- Evaluates route hazards.
- Recommends alternative routes.

The system does not simply select the shortest route—it considers available hazard information.

---

## 6️⃣ Resource Allocation Agent

Automatically recommends rescue resources based on:

- Incident severity.
- Number of people affected.
- Medical requirements.
- Rescue team availability.
- Team capabilities.
- Available vehicles.
- Boats and equipment.
- Travel time.
- Existing assignments.

High-risk dispatch decisions can require human approval.

---

## 7️⃣ Witness & Missing Person Agent

This agent processes reports from nearby people.

It can help investigate situations where:

- A person's phone stops transmitting.
- A phone may be found separately.
- Someone reports seeing a person in floodwater.
- Multiple witnesses report related events.

The system preserves separate information for:

- Last known phone location.
- Last known person location.
- Witness observations.

Witness reports remain unverified until appropriately reviewed or corroborated.

---

## 8️⃣ Notification Agent

Responsible for:

- Sending SOS acknowledgments.
- Alerting authorized responders.
- Sending incident updates.
- Notifying users about important safety updates.
- Reporting system failures.
- Managing notification retries.

---

## 9️⃣ Incident Memory & Audit Agent

Maintains a complete timeline of:

- SOS creation.
- Location updates.
- AI processing.
- Flood assessments.
- Resource recommendations.
- Witness reports.
- Human decisions.
- Status changes.

This provides transparency and traceability for the system.

---

# 🏗️ System Architecture

```text
┌───────────────────────────────┐
│      CITIZEN MOBILE APP       │
│                               │
│  🚨 SOS                       │
│  🎙️ Voice Message             │
│  📍 GPS Tracking              │
│  👥 Witness Reports           │
└───────────────┬───────────────┘
                │
                │ REST API / WebSocket
                ▼
┌───────────────────────────────┐
│        FASTAPI BACKEND        │
│                               │
│  • Authentication             │
│  • SOS Processing             │
│  • Location Management        │
│  • Real-Time Events           │
└───────────────┬───────────────┘
                │
                ▼
┌───────────────────────────────┐
│       AI AGENT SYSTEM         │
│                               │
│  🧠 SOS Triage Agent          │
│  🔎 Duplicate Detection       │
│  📍 Location Agent            │
│  🌊 Flood Analysis Agent      │
│  🧭 Evacuation Agent          │
│  🚑 Resource Agent            │
│  👥 Witness Agent             │
│  🔔 Notification Agent        │
└───────────────┬───────────────┘
                │
                ▼
┌───────────────────────────────┐
│      POSTGRESQL + POSTGIS     │
│                               │
│  • SOS Incidents              │
│  • Locations                  │
│  • Resources                  │
│  • Flood Data                 │
│  • Witness Reports            │
│  • Agent History              │
└───────────────┬───────────────┘
                │
                │ Real-Time Updates
                ▼
┌───────────────────────────────┐
│    DISASTER RESPONSE DASHBOARD│
│                               │
│  🗺️ Live Map                  │
│  🚨 SOS Queue                 │
│  🚑 Rescue Teams              │
│  🌊 Flood Zones               │
│  📦 Resource Allocation       │
└───────────────────────────────┘
```

---

# 🔄 How RESQ AI Works

### Step 1: User Sends SOS

The user presses the SOS button.

The application:

1. Creates an emergency event.
2. Captures the latest GPS location.
3. Records the timestamp.
4. Stores the event locally.
5. Sends it to the backend when connectivity is available.

---

### Step 2: SOS Appears on the Dashboard

Once the backend receives the SOS:

- The incident is stored in the database.
- The dashboard receives a real-time update.
- The incident appears on the emergency map.
- AI processing begins.

---

### Step 3: AI Agents Analyze the Incident

The AI system:

```text
SOS RECEIVED
      │
      ▼
🧠 TRIAGE AGENT
      │
      ▼
🔎 DUPLICATE DETECTION
      │
      ▼
📍 LOCATION ANALYSIS
      │
      ▼
🌊 FLOOD RISK ANALYSIS
      │
      ▼
🧭 EVACUATION PLANNING
      │
      ▼
🚑 RESOURCE ALLOCATION
      │
      ▼
🔔 RESPONDER NOTIFICATION
```

---

### Step 4: Location Tracking

After an SOS is created, the application can periodically update the user's location.

The system:

- Records new locations.
- Maintains location history.
- Preserves the original SOS location.
- Detects meaningful movement.
- Reassesses flood risk.
- Updates evacuation recommendations.

---

### Step 5: Rescue Resource Recommendation

Based on available information, RESQ AI recommends:

- Appropriate rescue teams.
- Required equipment.
- Possible routes.
- Priority level.

Authorized emergency coordinators can review and approve high-risk actions.

---

# 👥 Phone-Person Separation Detection

One unique feature of RESQ AI is handling situations where a phone may become separated from its owner.

### Example

```text
2:00 PM → User sends SOS 📱
2:05 PM → User location changes 📍
2:08 PM → Phone stops transmitting 📵
2:10 PM → Witness reports person in floodwater 👁️
2:12 PM → Another witness finds a phone 📱
```

The system creates a timeline and attempts to correlate available evidence.

It maintains separate records for:

- 📱 Last known phone location.
- 👤 Last known person location.
- 👁️ Witness observations.

The system does not automatically assume that the phone's location represents the person's location.

---

# 🛠️ Technology Stack

## Frontend — Mobile

- React Native
- Expo
- TypeScript
- Expo Router
- Expo Location
- SQLite

## Frontend — Dashboard

- React
- Vite
- TypeScript
- Tailwind CSS
- shadcn/ui
- Leaflet
- React-Leaflet
- Recharts

## Backend

- Python
- FastAPI
- SQLAlchemy
- Pydantic
- WebSockets

## Database

- PostgreSQL
- PostGIS

## AI & Machine Learning

- Multi-Agent AI Architecture
- Configurable LLM Provider
- Speech-to-Text Integration
- Sentence Transformers
- Scikit-learn
- Rule-Based Fallback System

## Geospatial Processing

- GeoPandas
- Shapely
- Rasterio
- NumPy
- SciPy
- NetworkX

## Infrastructure

- Docker
- Docker Compose
- Redis
- Background Workers
- GitHub

---

# 📁 Project Structure

```text
resq-ai/
│
├── apps/
│   ├── mobile/                 # Citizen SOS Mobile Application
│   │
│   └── dashboard/              # Emergency Response Dashboard
│
├── backend/
│   ├── app/
│   │   ├── api/                # API routes
│   │   ├── agents/             # AI agents
│   │   ├── core/               # Configuration & security
│   │   ├── db/                 # Database models
│   │   ├── integrations/       # External services
│   │   ├── schemas/            # Pydantic schemas
│   │   ├── services/           # Business logic
│   │   ├── tasks/              # Background tasks
│   │   └── main.py
│   │
│   └── tests/
│
├── infrastructure/
│   └── docker-compose.yml
│
├── scripts/
│   ├── seed_demo.py
│   └── simulate_flood.py
│
├── docs/
│   ├── architecture.md
│   ├── agents.md
│   ├── flood-model.md
│   └── security.md
│
├── .env.example
└── README.md
```

---

# 🚀 Installation

## 1. Clone the Repository

```bash
git clone YOUR_REPOSITORY_URL
cd resq-ai
```

## 2. Configure Environment Variables

Create a `.env` file:

```bash
cp .env.example .env
```

Update the required configuration values.

---

## 3. Start Infrastructure

```bash
docker compose -f infrastructure/docker-compose.yml up -d
```

---

## 4. Start the Backend

```bash
cd backend
```

Create and activate a Python virtual environment:

```bash
python -m venv venv
```

Windows:

```bash
venv\Scripts\activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Run database migrations:

```bash
alembic upgrade head
```

Start the server:

```bash
uvicorn app.main:app --reload
```

The API documentation will be available through the FastAPI documentation interface when the backend is running.

---

# 💻 Start the Dashboard

```bash
cd apps/dashboard
npm install
npm run dev
```

---

# 📱 Start the Mobile Application

```bash
cd apps/mobile
npm install
npx expo start
```

You can run the application using:

- Android Emulator.
- Physical Android Device.
- Expo Go where supported.

---

# 🧪 Demo Mode

RESQ AI supports a demonstration mode using simulated disaster data.

Demo mode can include:

- Simulated SOS alerts.
- Sample emergency messages.
- Simulated location updates.
- Sample flood hazard zones.
- Rescue teams.
- Vehicles and boats.
- Shelters.
- Witness reports.
- AI agent processing events.

To seed demonstration data:

```bash
python scripts/seed_demo.py
```

To run a simulated flood scenario:

```bash
python scripts/simulate_flood.py
```

> ⚠️ **All simulated data must be clearly labeled as demonstration data.**

---

# 🧪 Testing

Run backend tests:

```bash
cd backend
pytest
```

The system should test critical workflows such as:

- SOS creation.
- Duplicate detection.
- Location updates.
- Offline synchronization.
- Witness reports.
- Flood analysis.
- Evacuation recommendations.
- Resource allocation.
- Authorization.
- Agent failures.

---

# 🔐 Security & Privacy

RESQ AI handles sensitive emergency and location information.

The platform is designed with:

- 🔒 Role-Based Access Control.
- 🔑 Secure authentication.
- 📍 Restricted location access.
- 🛡️ Input validation.
- 📁 Secure file handling.
- 📝 Audit logging.
- 🔐 Environment-based secrets.
- 🧠 Restricted AI agent permissions.
- 🗑️ Configurable data retention.

Precise user locations should only be available to authorized emergency personnel.

---

# ⚠️ Important Limitations

RESQ AI is an AI-assisted decision-support platform.

It does **not** guarantee:

- Exact flood predictions.
- Continuous location tracking under all device conditions.
- Safe evacuation routes in every situation.
- Automatic emergency service dispatch.
- Successful SOS delivery without a functioning communication channel.

Flood prediction quality depends on:

- Available terrain data.
- Rainfall data.
- River gauge data.
- Flood observations.
- Model calibration.
- Data freshness.

AI-generated recommendations must be clearly distinguished from verified information.

High-risk operational decisions should involve authorized human review.

---

# 🔮 Future Enhancements

Potential future improvements include:

- 🌐 Multilingual emergency reporting.
- 🎤 Voice-based SOS interaction.
- 📡 SMS emergency fallback integration.
- 🛰️ Satellite communication integration.
- 🚁 Drone-based flood monitoring.
- 📷 Computer vision for disaster assessment.
- 📊 Advanced flood forecasting models.
- 🧠 Improved multi-agent coordination.
- 🚑 Integration with emergency response agencies.
- 🗺️ Real-time road closure data.
- 🌍 Support for additional disaster types.

---

# 🤝 Contributing

Contributions are welcome.

To contribute:

1. Fork the repository.
2. Create a new branch.

```bash
git checkout -b feature/your-feature-name
```

3. Make your changes.
4. Commit the changes.

```bash
git add .
git commit -m "Add your feature"
```

5. Push your branch.

```bash
git push origin feature/your-feature-name
```

6. Create a Pull Request.

---

# 📜 License

This project is intended for educational, research, hackathon, and prototype purposes unless a different license is added to this repository.

---

# 👨‍💻 Team

**RESQ AI Development Team**

An AI-powered disaster response and flood rescue coordination project.

---

# ⭐ Project Vision

> **"Turning emergency reports into faster, more coordinated, and data-driven disaster response."**

RESQ AI combines **mobile emergency reporting, real-time geospatial intelligence, multi-agent AI, flood-risk analysis, evacuation planning, and resource coordination** to help emergency response teams process critical information more efficiently.
