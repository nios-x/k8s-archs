kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.13.3/deploy/static/provider/aws/deploy.yaml
# creates external reource

# This AWS account can't create NLBs (ELBv2: OperationNotPermitted), so drop the
# NLB annotation and let EKS create a Classic ELB instead.
kubectl annotate svc ingress-nginx-controller -n ingress-nginx service.beta.kubernetes.io/aws-load-balancer-type-
