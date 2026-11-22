# k8s-2: one LoadBalancer per service (EKS)

Runs on EKS. The frontend and backend each get a LoadBalancer service, so AWS creates two Classic ELBs. Postgres is ClusterIP. The images come from Docker Hub (`devsoumya7/*`), and GitHub Actions rebuilds them on every push to `main` that changes `frontend/` or `backend/`.

**Frontend:** the browser calls the backend's ELB directly, so both `fetch` calls in `frontend/src/App.tsx` must use the backend's ELB address. The current code calls `/api/`, which only works in k8s-3 and k8s-4.

## Run

```powershell
kubectl config current-context      # must be the EKS cluster
cd C:\Users\HP\Desktop\ss\k8s-2-loadbalancers
kubectl apply -f postgres.yml -f postgres-svc.yml -f backend-deployment.yml -f backend-svc.yml -f frontend-deployment.yml -f frontend-svc.yml
kubectl get svc -w                  # wait for both EXTERNAL-IPs
```

Then put `backend-serv`'s EXTERNAL-IP into `App.tsx` and push to `main`, which rebuilds the image. Run `kubectl rollout restart deployment frontend-dep` to pick it up. The backend gets a new ELB address every time `backend-serv` is recreated, so repeat this step each time.

## Open

- App: `http://<frontend-serv EXTERNAL-IP>/`
- API: `http://<backend-serv EXTERNAL-IP>/`

A new ELB's DNS name takes 2–5 minutes to resolve.

## Delete

```powershell
kubectl delete -f frontend-svc.yml -f frontend-deployment.yml -f backend-svc.yml -f backend-deployment.yml -f postgres-svc.yml -f postgres.yml
```

Then check that EC2 → Load Balancers (ap-south-1) is empty.
