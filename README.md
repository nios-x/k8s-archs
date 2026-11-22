# ☸️ Learn Kubernetes with one small app

Deploy the **same note-taking app 4 different ways**, from the simplest setup to a realistic one.
Each step fixes a problem left by the step before it.

**Step 1** NodePort → **Step 2** LoadBalancers → **Step 3** Ingress → **Step 4** your own gateway

---

## ⚡ Try it now (free, on your laptop, about 5 minutes)

**You need:** [Docker Desktop](https://www.docker.com/products/docker-desktop/) (running), [kind](https://kind.sigs.k8s.io/docs/user/quick-start/#installation) and [kubectl](https://kubernetes.io/docs/tasks/tools/).

```powershell
cd k8s-4-single-lb-multiple-clusterip-diff-pods
kind create cluster --name learn --config cluster.yml
kubectl apply -f postgres.yml -f postgres-svc.yml -f backend-deployment.yml -f backend-svc.yml -f frontend-deployment.yml -f frontend-svc.yml
kubectl apply -f gateway-configmap.yml -f gateway-deployment.yml -f gateway-svc.yml
kubectl get pods -w        # wait until every pod says Running, then press Ctrl+C
```

Now open **http://localhost:30007**, type a note and press **SEND** 🎉

When you're done:

```powershell
kind delete cluster --name learn
```

> [!NOTE]
> On a laptop, `kubectl get svc` shows `EXTERNAL-IP <pending>`. That's normal: there's no cloud to create a load balancer, so you use port `30007` instead.

---

## 🧩 The app

| Part | What it does |
| --- | --- |
| **frontend** | React page where you write notes |
| **backend** | Express API that saves and lists notes |
| **database** | Postgres, which stores the notes |

> [!TIP]
> **The one idea to remember:** the React code runs **in your browser**, so your browser has to reach the backend.
> Each step below solves this in a different way.

---

## 📖 5 words you need

| Word | In plain English |
| --- | --- |
| **Pod** | One running copy of your app. It can die at any time and gets replaced. |
| **Deployment** | A manager that keeps a set number of pods running (here, 3). Delete a pod and it starts a new one. |
| **Service** | A fixed name, like `backend-serv`, that sends traffic to the right pods. |
| **Ingress** | Rules such as "`/api` goes to the backend". An Ingress controller (nginx) follows them. |
| **ConfigMap** | A config file stored inside Kubernetes. |

There are **3 kinds of Service**:

| Type | Who can reach it | Cost on AWS |
| --- | --- | --- |
| `ClusterIP` | Only things inside the cluster | free |
| `NodePort` | Anyone, at node-IP plus a port from 30000 to 32767 | free |
| `LoadBalancer` | Anyone, at a public address from the cloud | 💸 paid every hour |

<details>
<summary><b>How does a Service find its pods?</b> (click)</summary>

By **labels**. The Deployment sticks a label on every pod, and the Service picks every pod with that label:

```yaml
# backend-deployment.yml        # backend-svc.yml
labels:                         selector:
  app: backendlabel               app: backendlabel
```
</details>

<details>
<summary><b>Why are there 4 port numbers?</b> (click)</summary>

```
nodePort 30008  ->  port 80  ->  targetPort 8000  =  containerPort 8000
 (on the node)      (Service)    (on the pod)        (what the app listens on)
```
</details>

---

## 🗺️ The 4 steps

| | Step 1 | Step 2 | Step 3 | Step 4 |
| --- | --- | --- | --- | --- |
| **Folder** | [k8s-1](k8s-1-node-port/) | [k8s-2](k8s-2-loadbalancers/) | [k8s-3](k8s-3-ingess-controller/) | [k8s-4](k8s-4-single-lb-multiple-clusterip-diff-pods/) |
| **Runs on** | laptop | AWS | AWS | AWS or laptop |
| **Public entry points** | 2 ports | 2 load balancers | 1 load balancer | 1 load balancer |
| **Frontend calls backend at** | `localhost:30008` | backend's own URL | `/api/` | `/api/` |
| **Cost** | free | 💸💸 | 💸 | 💸 (free on a laptop) |

Each folder has a short README with the commands to **run**, **open** and **delete** it.

### Step 1: NodePort ([`k8s-1-node-port/`](k8s-1-node-port/))

<img width="1562" height="887" alt="Screenshot 2026-11-22 192131" src="https://github.com/user-attachments/assets/00ed007e-dacd-49e6-aa74-dc15b1b4a8e4" />

- **Idea:** open a port on the node for each part: frontend on `30007`, backend on `30008`.
- **Problem:** odd port numbers on node IPs work on a laptop, but not for real users. ➜ Step 2

### Step 2: one load balancer per app ([`k8s-2-loadbalancers/`](k8s-2-loadbalancers/))

<img width="1542" height="727" alt="Screenshot 2026-11-22 194007" src="https://github.com/user-attachments/assets/917db084-0917-48dd-8e55-85dc6ce94803" />

- **Idea:** `type: LoadBalancer` asks AWS for a public address. The frontend and the backend get one each.
- **Problem:** two load balancers means paying twice. On top of that, the backend's URL is written into the frontend code, so you rebuild the frontend every time it changes. ➜ Step 3

### Step 3: one load balancer + Ingress ([`k8s-3-ingess-controller/`](k8s-3-ingess-controller/))

<img width="1462" height="787" alt="Screenshot 2026-11-23 011722" src="https://github.com/user-attachments/assets/a66b2af6-7462-4af3-9ffe-9e89cd0b0358" />

- **Idea:** one public address. The Ingress controller sends `/` to the frontend and `/api` to the backend, so the frontend just calls `/api/`.
- **Problem:** you install a big third-party controller and can't see what it does. ➜ Step 4

### Step 4: one load balancer + your own nginx ([`k8s-4-single-lb-multiple-clusterip-diff-pods/`](k8s-4-single-lb-multiple-clusterip-diff-pods/))

<img width="1630" height="822" alt="image" src="https://github.com/user-attachments/assets/0001b31a-4372-4cae-b433-244d8ecf0e6e" />

- **Idea:** do step 3 by hand, with plain nginx pods and a ConfigMap holding the routing rules. Now you can see that an Ingress controller is "just nginx".
- **Bonus:** it also runs on your laptop. That's the [quick start](#-try-it-now-free-on-your-laptop-about-5-minutes) above.

---

## 🧪 Play with it

Run these while the app is running and watch what Kubernetes does:

```powershell
kubectl get pods -o wide                       # every pod, its node and its IP
kubectl scale deployment backend-dep --replicas=5
kubectl delete pod <any-backend-pod-name>      # the Deployment brings it back
kubectl logs deploy/backend-dep                # the backend's output
kubectl describe svc backend-serv              # "Endpoints" = the pods behind it
```

<details>
<summary><b>🆘 Something not working?</b> (click for common problems)</summary>

| What you see | Why it happens | What to do |
| --- | --- | --- |
| `kubectl apply -f .` fails | `cluster.yml` is a kind file, not Kubernetes | list the files: `-f a.yml -f b.yml` |
| Pods come back after you delete them | The Deployment replaces them | delete the Deployment instead |
| Backend shows `RESTARTS 1` | It started before the database was ready | nothing; Kubernetes restarted it for you |
| `port is already allocated` | Another kind cluster is using port 30007 | `kind get clusters`, then delete the old one |
| `/api/` gives 404 | The backend only knows `/` | strip `/api` (k8s-3: `rewrite-target`, k8s-4: `proxy_pass .../;`) |
| Load balancer stuck on `<pending>` on AWS | The account can't create the newer NLB type | use a Classic ELB (see the k8s-3 README) |
| `Could not resolve host` | A new load balancer takes 2–5 min to get DNS | wait, or switch your DNS to `8.8.8.8` |
| Notes disappear | The database has no volume, so its data dies with the pod | add a PersistentVolumeClaim (good next exercise!) |
| Edited the ConfigMap, nothing changed | nginx only reads its config at startup | `kubectl rollout restart deployment gateway-dep` |
</details>

---

## 💸 Using AWS? Read this first

> [!WARNING]
> On AWS you pay **every hour, even when nobody uses the app**, for:
> each load balancer, the EKS cluster (even when it's empty), and the worker machine.
>
> When you're done: **delete the app first** (its folder's README shows how), **then the cluster**.
> If you delete the cluster first, its load balancers get left behind and keep charging.

<details>
<summary><b>Commands to delete the EKS cluster</b></summary>

```powershell
aws eks delete-nodegroup --cluster-name sxoo-cluster --nodegroup-name soumya-workers --region ap-south-1
aws eks wait nodegroup-deleted --cluster-name sxoo-cluster --nodegroup-name soumya-workers --region ap-south-1
aws eks delete-cluster --name sxoo-cluster --region ap-south-1
```

Then check that EC2 → Load Balancers (ap-south-1) is empty in the AWS console.
</details>

---

## 📚 Learn more (free)

- [Killercoda](https://killercoda.com/): free Kubernetes clusters in your browser
- [Kubernetes tutorials](https://kubernetes.io/docs/tutorials/): the official step-by-step guides
- **Introduction to Kubernetes (LFS158):** a free course from the Linux Foundation

<details>
<summary><b>📁 What's in this repo</b></summary>

```
backend/      Express API + Dockerfile
frontend/     React app + Dockerfile
compose/      Postgres only, for working on the backend locally
references/   tiny examples: a Pod, a ReplicaSet, a Service
k8s-1-…       step 1     k8s-2-…  step 2
k8s-3-…       step 3     k8s-4-…  step 4
.github/      builds the images and pushes them to Docker Hub on every push to main
```
</details>
