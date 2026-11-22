# k8s-3: ingress-nginx controller (EKS)

Runs on EKS. The frontend and backend are ClusterIP. The ingress-nginx controller has the only LoadBalancer (one Classic ELB). `backend-ingress.yml` sends `/api/...` to the backend, with `/api` removed, and everything else to the frontend.

**Frontend:** `App.tsx` must call `/api/`, which the current code already does. The images come from Docker Hub (`devsoumya7/*`).

## Run

```powershell
kubectl config current-context      # must be the EKS cluster
cd C:\Users\HP\Desktop\ss\k8s-3-ingess-controller

# 1. the ingress-nginx controller (the same commands as nginx-controller.sh)
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.13.3/deploy/static/provider/aws/deploy.yaml
kubectl annotate svc ingress-nginx-controller -n ingress-nginx service.beta.kubernetes.io/aws-load-balancer-type-
kubectl wait -n ingress-nginx --for=condition=ready pod -l app.kubernetes.io/component=controller --timeout=180s

# 2. the app and the Ingress rules
kubectl apply -f postgres.yml -f postgres-svc.yml -f backend-deployment.yml -f backend-svc.yml -f frontend-deployment.yml -f frontend-svc.yml -f backend-ingress.yml
kubectl get svc -n ingress-nginx -w # wait for EXTERNAL-IP
```

The `annotate` line removes the NLB setting, because this AWS account can't create NLBs. AWS creates a Classic ELB instead.

## Open

- App: `http://<ingress-nginx-controller EXTERNAL-IP>/`
- API: `http://<ingress-nginx-controller EXTERNAL-IP>/api/`

A new ELB's DNS name takes 2–5 minutes to resolve.

## Delete

```powershell
kubectl delete -f backend-ingress.yml -f frontend-svc.yml -f frontend-deployment.yml -f backend-svc.yml -f backend-deployment.yml -f postgres-svc.yml -f postgres.yml
kubectl delete -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.13.3/deploy/static/provider/aws/deploy.yaml
```

The second command removes the ELB. It may print `jobs.batch ... not found`; that's harmless. More detail is in `delete..mdlogs.md`.
