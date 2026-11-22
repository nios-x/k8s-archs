# Kubernetes architectures: learn by doing

One small app is deployed 4 different ways. Each folder is one step, and each step fixes a problem left by the step before it.

```
k8s-1  NodePort          ->  k8s-2  LoadBalancers  ->  k8s-3  Ingress  ->  k8s-4  your own gateway
(local, kind)                (AWS EKS)                 (AWS EKS)           (AWS EKS)
```

Every folder has its own `README.md` with the exact commands to run, open and delete it.

---

## 1. The app

A tiny note-taker with three parts:

| Part         | What it is            | Port inside the pod |
| ------------ | --------------------- | ------------------- |
| `frontend/`  | React page            | 3000                |
| `backend/`   | Express API: `GET /` lists notes, `POST /` adds a note | 8000 |
| Postgres     | Database              | 5432                |

Here's what trips most people up:

> **The React code runs in your browser, not in the cluster.**
> So the call to the backend comes from your laptop. That's why "how does the browser reach the backend?" is the question every architecture below answers differently.

The backend reaches Postgres from inside the cluster, using its service name: `host: "postgres-serv"` in `backend/src/index.ts`. Postgres never needs to be public.

---

## 2. Words to know first

**Pod**: one running copy of a container. Pods are temporary: they die, they get replaced, and their IP changes.

**Deployment**: says "keep 3 copies of this pod running". If you delete a pod, the Deployment starts a new one. *(To really stop pods, delete the Deployment.)*

**Service**: a fixed name and IP in front of a group of pods. Other pods call `backend-serv` instead of chasing pod IPs. A Service comes in three types:

| Type           | Who can reach it                         | Used in      |
| -------------- | ---------------------------------------- | ------------ |
| `ClusterIP`    | Only things inside the cluster (default) | every folder (Postgres), k8s-3, k8s-4 |
| `NodePort`     | Anyone who can reach a node, on a port in the 30000–32767 range | k8s-1 |
| `LoadBalancer` | The internet, through a cloud load balancer (**costs money**) | k8s-2, k8s-4 |

**Labels and selectors**: how a Service finds its pods.

```yaml
# backend-deployment.yml stamps this label on every backend pod
labels:
  app: backendlabel
# backend-svc.yml sends traffic to every pod with that label
selector:
  app: backendlabel
```

**The four ports.** People mix these up all the time:

```
nodePort 30008  ->  port 80  ->  targetPort 8000  =  containerPort 8000
(on the node)      (Service)     (in the pod)        (what the app listens on)
```

**Ingress** (k8s-3): a set of routing rules, for example "`/api` goes to the backend". It does nothing by itself. An **Ingress controller** (a pod running nginx) reads the rules and does the routing.

**ConfigMap** (k8s-4): a config file stored in Kubernetes and mounted into a pod. We use one to hold nginx's config.

---

## 3. The learning path

### Step 0: warm-up (`references/`, `compose/`)

- `references/` has the smallest possible examples: a bare Pod (`nginx.yml`, `postgres.yml`), a ReplicaSet that keeps 3 copies (`replicaset.yml`), and a NodePort Service (`service.yml`).
- `compose/docker-compose.yml` runs just Postgres on your machine, so you can work on the backend without Kubernetes.

### Step 1: NodePort (`k8s-1-node-port/`): runs on your laptop

<img width="1562" height="887" alt="Screenshot 2026-11-22 192131" src="https://github.com/user-attachments/assets/00ed007e-dacd-49e6-aa74-dc15b1b4a8e4" />

```
browser
  | localhost:30007               | localhost:30008
  v                               v
frontend-serv (NodePort)      backend-serv (NodePort)
  |                               |
frontend pods x3              backend pods x3 --> postgres-serv (ClusterIP) --> postgres pod
```

- **You learn:** Deployments, Services, labels, and how kind's `cluster.yml` maps node ports to `localhost`.
- **The frontend calls:** `http://localhost:30008/`
- **The problem:** NodePorts are odd high-numbered ports on each node's IP. That's fine on a laptop, not how you'd serve real users.

### Step 2: one LoadBalancer per service (`k8s-2-loadbalancers/`)

<img width="1542" height="727" alt="Screenshot 2026-11-22 194007" src="https://github.com/user-attachments/assets/917db084-0917-48dd-8e55-85dc6ce94803" />

```
browser
  | ELB #1                        | ELB #2
  v                               v
frontend-serv (LoadBalancer)  backend-serv (LoadBalancer)
  |                               |
frontend pods                 backend pods --> postgres
```

- **You learn:** with `type: LoadBalancer`, AWS creates a real load balancer (ELB) with a public address.
- **The frontend calls:** the backend ELB's address, hardcoded in `App.tsx`.
- **The problems:**
  - You pay for **two** ELBs.
  - The backend's address is baked into the frontend image, so every new ELB means a rebuild.
  - The browser calls a different address from the page it loaded, so the backend needs CORS (`app.use(cors())`).

### Step 3: Ingress controller (`k8s-3-ingess-controller/`)
<img width="1462" height="787" alt="Screenshot 2026-11-23 011722" src="https://github.com/user-attachments/assets/a66b2af6-7462-4af3-9ffe-9e89cd0b0358" />


```
browser
  | one ELB
  v
ingress-nginx controller        <- reads the rules in backend-ingress.yml
  | /                 | /api/...
  v                   v
frontend-serv     backend-serv     (both ClusterIP: not public any more)
```

- **You learn:** path-based routing. There's one address for everything: `/` goes to the frontend and `/api/` goes to the backend.
- **The frontend calls:** `/api/`, a path on the same address it loaded from, so there's no hardcoded URL and no rebuild per environment.
- **A detail:** the backend only serves `/`, so the Ingress strips the prefix: `/api/posts` becomes `/posts` (`rewrite-target`).
- **The trade-off:** you install and trust a whole third-party controller.

### Step 4: your own gateway (`k8s-4-single-lb-multiple-clusterip-diff-pods/`)

```
browser
  | one ELB (gateway-serv)
  v
gateway pods: plain nginx       <- rules in gateway-configmap.yml
  | /                 | /api/...
  v                   v
frontend-serv     backend-serv     (both ClusterIP)
```

- **You learn:** what an Ingress controller really is. It's just nginx, so here you build it by hand, with a Deployment, a ConfigMap and one LoadBalancer Service.
- **The frontend calls:** `/api/`, the same as in step 3.
- **A detail:** the prefix is stripped by the trailing `/` in `proxy_pass http://backend-serv/;`.

### Side by side

|                               | k8s-1          | k8s-2              | k8s-3              | k8s-4               |
| ----------------------------- | -------------- | ------------------ | ------------------ | ------------------- |
| Runs on                       | kind (laptop)  | EKS                | EKS                | EKS                 |
| Public entry points           | 2 NodePorts    | 2 ELBs             | 1 ELB              | 1 ELB               |
| Frontend calls backend at     | `localhost:30008` | backend ELB URL | `/api/`            | `/api/`             |
| Where routing lives           | none           | none               | Ingress objects    | nginx ConfigMap     |
| Backend public?               | yes            | yes                | no                 | no                  |

---

## 4. Try it yourself

Run these while any setup is up. They're the quickest way to *see* what Kubernetes does.

```powershell
kubectl get pods -o wide                         # which node each pod is on, and its IP
kubectl scale deployment backend-dep --replicas=5
kubectl get pods -w                              # watch the new pods start (Ctrl+C to stop)
kubectl delete pod <one-backend-pod-name>        # ...and watch the Deployment replace it
kubectl describe svc backend-serv                # "Endpoints" = the pod IPs behind the Service
kubectl logs deploy/backend-dep                  # the backend's console.log output
kubectl port-forward svc/backend-serv 8080:80    # open http://localhost:8080, no load balancer needed
```

In k8s-4 you can also call the backend from inside the gateway pod, the same way nginx does:

```powershell
kubectl exec deploy/gateway-dep -- wget -qO- http://backend-serv/
```

---

## 5. Problems we actually hit, and why

| What you see | Why | Fix |
| ------------ | --- | --- |
| `kubectl apply -f .` fails | `cluster.yml` is a kind file, not a Kubernetes object | list the files: `-f a.yml -f b.yml` |
| Deleted pods come straight back | The Deployment replaces them | delete the Deployment |
| Backend pods show `RESTARTS 1` | The backend started before Postgres was ready, crashed, and was restarted | nothing; this is Kubernetes healing itself |
| `/api/` returns 404 | The backend only knows `/`, but got `/api/` | strip the prefix (`rewrite-target` in k8s-3, `proxy_pass .../;` in k8s-4) |
| LoadBalancer stuck on `<pending>` with `OperationNotPermitted` | This AWS account can't create NLBs | remove the NLB annotation to get a Classic ELB (see k8s-3) |
| `Could not resolve host` for a new ELB | DNS takes 2–5 minutes, and your PC's DNS may remember the early "not found" | wait, or use DNS `8.8.8.8` |
| All notes are gone after a redeploy | Postgres has no volume, so its data dies with the pod | add a PersistentVolumeClaim (a good next exercise) |
| Edited a ConfigMap and nothing changed | nginx read its config at startup | `kubectl rollout restart deployment gateway-dep` |

---

## 6. Cost: read this before using AWS

On EKS these are **billed every hour, even if nobody visits the app**:

- each `LoadBalancer` Service (one ELB each)
- the EKS cluster itself, even when it's empty
- the worker node (EC2 instance) and its disk

When you're done, delete in this order:

```powershell
# 1. your app (each folder's README has the exact delete command); this removes the ELBs
# 2. in k8s-3 only: the ingress-nginx controller
# 3. the cluster (node group first, then the cluster)
aws eks delete-nodegroup --cluster-name sxoo-cluster --nodegroup-name soumya-workers --region ap-south-1
aws eks wait nodegroup-deleted --cluster-name sxoo-cluster --nodegroup-name soumya-workers --region ap-south-1
aws eks delete-cluster --name sxoo-cluster --region ap-south-1
```

Delete the app *before* the cluster. If you delete the cluster first, nothing is left to clean up the ELBs, and they keep charging. Check the AWS console under EC2 → Load Balancers (ap-south-1) afterwards.

---

## 7. Folder map

```
backend/        Express API + Dockerfile
frontend/       React app + Dockerfile
compose/        Postgres for local development
references/     tiny Pod / ReplicaSet / Service examples
k8s-1-node-port/                            step 1
k8s-2-loadbalancers/                        step 2
k8s-3-ingess-controller/                    step 3
k8s-4-single-lb-multiple-clusterip-diff-pods/  step 4
.github/workflows/docker-publish.yml        pushes devsoumya7/backend and devsoumya7/frontend
                                            to Docker Hub on every push to main
```
