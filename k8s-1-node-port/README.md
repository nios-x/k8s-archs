# k8s-1: NodePort (local, kind)

Runs on a local kind cluster. The frontend and backend are NodePort services, and `cluster.yml` maps their ports to your machine: frontend on 30007, backend on 30008. Postgres is ClusterIP, so it's only reachable inside the cluster.

**Frontend:** the browser talks to the backend directly, so both `fetch` calls in `frontend/src/App.tsx` must use `http://localhost:30008/`. The current code calls `/api/`, which only works in k8s-3 and k8s-4.

## Run

```powershell
cd C:\Users\HP\Desktop\ss
kind create cluster --name sxoo --config k8s-1-node-port\cluster.yml
docker build -t backend:latest backend
docker build -t frontend:latest frontend
kind load docker-image backend:latest frontend:latest --name sxoo

cd k8s-1-node-port
kubectl apply -f postgres.yml -f postgres-svc.yml -f backend-deployment.yml -f backend-svc.yml -f frontend-deployment.yml -f frontend-svc.yml
```

The images are local, so they're loaded into kind instead of pulled. After a rebuild, run `kind load` again and then `kubectl rollout restart deployment frontend-dep` (or `backend-dep`).

## Open

- App: http://localhost:30007
- API: http://localhost:30008

## Delete

```powershell
kind delete cluster --name sxoo
```

`kind create cluster` switches kubectl to the kind cluster. To go back to EKS, run `aws eks update-kubeconfig --name sxoo-cluster --region ap-south-1`.
