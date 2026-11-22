1. Delete your app (ingresses, deployments and services):


cd C:\Users\HP\Desktop\ss\k8s-3-ingess-controller
kubectl delete -f backend-ingress.yml -f frontend-deployment.yml -f frontend-svc.yml -f backend-deployment.yml -f backend-svc.yml -f postgres.yml -f postgres-svc.yml
Delete the deployments, not the pods: if you only delete pods, their deployments start new ones straight away. Postgres has no persistent volume, so all your notes are deleted along with its pod.

2. Delete the ingress-nginx controller and its ELB:


kubectl delete -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.13.3/deploy/static/provider/aws/deploy.yaml
This removes the ingress-nginx namespace and its LoadBalancer service, and AWS then deletes the Classic ELB (a90199d6...elb.amazonaws.com). It can take a minute while the namespace finishes deleting.

3. Check that everything is gone:


kubectl get all
kubectl get ingress
kubectl get ns ingress-nginx
Only service/kubernetes should be left in the first output. In the AWS console, go to EC2 → Load Balancers in the ap-south-1 (Mumbai) region and make sure the list is empty. Also check that the k8s-2 load balancer (a95a9afe...) isn't still there.

4. (Optional) Delete the EKS cluster itself. The cluster and its worker nodes still cost money when nothing is running on them. If you created it with eksctl:


eksctl delete cluster --name <your-cluster-name> --region ap-south-1
If you made it in the console, delete the node group first, then the cluster. Always do step 2 before this one. If the cluster is deleted while the ingress controller is still running, the ELB can be left behind and keep charging you.