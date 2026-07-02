# LogiFlow - API Specification Design

This document details the REST API endpoints and payload schemas for LogiFlow.

---

## 1. Global Specifications

* **Base URL:** `/api/v1`
* **Content Type:** `application/json`
* **Authentication:** Bearer JWT Token in request header: `Authorization: Bearer <token>`
* **Cross-Origin Resource Sharing (CORS):** Restricted to trusted clients.
* **Standard Response Wrapper (for Errors):**
  ```json
  {
    "success": false,
    "error": {
      "code": "VALIDATION_ERROR",
      "message": "Detailed description of error",
      "details": []
    }
  }
  ```

---

## 2. Authentication & Profile (`/auth`)

### 2.1 Register Company & Admin
Registers a tenant company along with its initial administrator user.
* **Endpoint:** `POST /auth/register`
* **Request Body:**
  ```json
  {
    "company_name": "Acme Logistics",
    "admin_name": "John Doe",
    "admin_email": "admin@acmelogistics.com",
    "admin_password": "SecurePassword123!"
  }
  ```
* **Response (201 Created):**
  ```json
  {
    "success": true,
    "company_id": "8f8ef19b-c4f9-4674-8d4a-bc1223fa8c9c",
    "admin_id": "7a35de50-705b-4c22-b5e1-7e8876fead45",
    "message": "Company and administrator registered successfully. Verification email sent."
  }
  ```

### 2.2 Login (JWT Token Request)
Issues Access & Refresh tokens.
* **Endpoint:** `POST /auth/token`
* **Request Body:** Standard OAuth2 form-data or JSON with `username` (email) and `password`.
* **Response (200 OK):**
  ```json
  {
    "access_token": "eyJhbGciOi...",
    "refresh_token": "eyJhbGciOi...",
    "token_type": "bearer",
    "expires_in": 3600
  }
  ```

### 2.3 Token Refresh
Issues a new Access Token using a valid Refresh Token.
* **Endpoint:** `POST /auth/refresh`
* **Request Body:**
  ```json
  {
    "refresh_token": "eyJhbGciOi..."
  }
  ```
* **Response (200 OK):**
  ```json
  {
    "access_token": "eyJhbGciOi...",
    "token_type": "bearer",
    "expires_in": 3600
  }
  ```

### 2.4 Get Current User Profile
Retrieves the logged-in user profile, company context, and permissions.
* **Endpoint:** `GET /auth/me`
* **Headers:** `Authorization: Bearer <access_token>`
* **Response (200 OK):**
  ```json
  {
    "id": "7a35de50-705b-4c22-b5e1-7e8876fead45",
    "email": "admin@acmelogistics.com",
    "full_name": "John Doe",
    "role": "Company Admin",
    "company": {
      "id": "8f8ef19b-c4f9-4674-8d4a-bc1223fa8c9c",
      "name": "Acme Logistics",
      "gst_number": null
    },
    "permissions": [
      "shipment:create",
      "shipment:delete",
      "driver:assign",
      "billing:manage",
      "reports:view"
    ]
  }
  ```

---

## 3. Shipment Management (`/shipments`)

### 3.1 Create Shipment
* **Endpoint:** `POST /shipments`
* **Headers:** `Authorization: Bearer <access_token>`
* **Request Body:**
  ```json
  {
    "customer_id": "f516a5b6-7649-4eb5-aa9c-6a7fbf668eb7",
    "pickup_address": "123 Warehouse St, City A",
    "delivery_address": "456 Customer Ave, City B",
    "warehouse_id": "c1f7a0ea-5e4f-4d3f-b883-fa493240e945",
    "items": [
      {
        "description": "Lithium Batteries",
        "quantity": 5,
        "weight_kg": 25.5,
        "dimensions": "30x20x15 cm"
      }
    ]
  }
  ```
* **Response (201 Created):**
  ```json
  {
    "id": "da148b52-bc5c-42b7-8495-728bdf69a4ea",
    "tracking_number": "LF-2026-981247",
    "status": "pending",
    "created_at": "2026-07-02T18:00:00Z"
  }
  ```

### 3.2 List/Search Shipments (With Filters & Pagination)
* **Endpoint:** `GET /shipments?page=1&size=20&status=in_transit&search=LF-2026`
* **Headers:** `Authorization: Bearer <access_token>`
* **Response (200 OK):**
  ```json
  {
    "items": [
      {
        "id": "da148b52-bc5c-42b7-8495-728bdf69a4ea",
        "tracking_number": "LF-2026-981247",
        "customer_name": "Apex Corp",
        "status": "in_transit",
        "driver_name": "Robert Smith",
        "created_at": "2026-07-02T18:00:00Z"
      }
    ],
    "total": 120,
    "page": 1,
    "size": 20,
    "pages": 6
  }
  ```

---

## 4. GPS & Live Tracking (`/tracking`)

### 4.1 Update Coordinates (Driver Mobile Upload)
* **Endpoint:** `POST /tracking/coordinates`
* **Headers:** `Authorization: Bearer <access_token>`
* **Request Body:**
  ```json
  {
    "shipment_id": "da148b52-bc5c-42b7-8495-728bdf69a4ea",
    "latitude": 37.774929,
    "longitude": -122.419416,
    "speed_kmh": 65.5
  }
  ```
* **Response (200 OK):**
  ```json
  {
    "success": true,
    "timestamp": "2026-07-02T18:10:00Z"
  }
  ```
