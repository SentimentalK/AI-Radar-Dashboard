# AI Radar Dashboard — K3s Kubernetes Deployment Guide

This document outlines the planned K3s deployment architecture for future phases of the AI Radar Dashboard.

## Planned Resources

For deployment to a K3s cluster, the following resources will be declared:

1. **Namespace**: Isolates the `ai-radar` resources.
2. **Web Deployment & Service**:
   - Runs the built React Nginx static web container.
   - Scalable to multiple replicas if desired.
3. **API Deployment & Service**:
   - Runs the Express API server container.
   - **Crucial Rule**: The API deployment must be constrained to exactly **1 replica (`replicas: 1`)** because it uses an embedded SQLite database stored on a persistent volume. Multiple replicas writing to the same database file simultaneously could cause SQLite locking issues.
4. **PersistentVolumeClaim (PVC)**:
   - Requests a persistent block volume (using the local-path storage class or similar default provisioner in K3s).
   - Mounted at `/data` inside the API container to persist the SQLite database file (`/data/radar.sqlite`).
5. **Ingress Route**:
   - Defines a routing rule where `/` traffic is directed to the `web` service.
   - Trailing paths starting with `/api` are directed to the `api` service.
6. **CronJob**:
   - An optional Kubernetes CronJob running daily.
   - Executes the ingestion/enrichment pipeline (`npm run radar:daily`).
   - Must use `concurrencyPolicy: Forbid` to prevent overlapping runs from locking the SQLite database.
