# k8s-4: one LoadBalancer + your own nginx gateway (EKS)

Runs on EKS. This is like k8s-3, but without the ingress controller. `gateway-serv` is the only LoadBalancer (one Classic ELB), and it sends traffic to plain nginx pods (`gateway-dep`). They route using `gateway-configmap.yml`: `/api/...` goes to `backend-serv` with `/api` removed, and everything else goes to `frontend-serv`. Both of those are ClusterIP.

**Frontend:** `App.tsx` must call `/api/`, which the current code already does. The images come from Docker Hub (`devsoumya7/*`).

## Run

```powershell
kubectl config current-context      # must be the EKS cluster
cd C:\Users\HP\Desktop\ss\k8s-4-single-lb-multiple-clusterip-diff-pods
kubectl apply -f postgres.yml -f postgres-svc.yml -f backend-deployment.yml -f backend-svc.yml -f frontend-deployment.yml -f frontend-svc.yml
kubectl apply -f gateway-configmap.yml -f gateway-deployment.yml -f gateway-svc.yml
kubectl get svc gateway-serv -w     # wait for EXTERNAL-IP
```

Apply the app first, because nginx looks up `backend-serv` and `frontend-serv` when it starts. After you edit `gateway-configmap.yml`, apply it and run `kubectl rollout restart deployment gateway-dep`.

## Open

- App: `http://<gateway-serv EXTERNAL-IP>/`
- API: `http://<gateway-serv EXTERNAL-IP>/api/`
- Health check: `http://<gateway-serv EXTERNAL-IP>/healthz`

A new ELB's DNS name takes 2–5 minutes to resolve. If you still get `Could not resolve host` after that, your local DNS has cached the failed lookup. Wait a few minutes, or switch to `8.8.8.8`.

## Delete

```powershell
kubectl delete -f gateway-svc.yml -f gateway-deployment.yml -f gateway-configmap.yml -f frontend-svc.yml -f frontend-deployment.yml -f backend-svc.yml -f backend-deployment.yml -f postgres-svc.yml -f postgres.yml
```

Then check that EC2 → Load Balancers (ap-south-1) is empty.
