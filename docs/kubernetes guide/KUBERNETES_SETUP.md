# Borla Backend Kubernetes Setup

This setup runs the backend as a 3-replica Kubernetes Deployment behind a Service.

## What it includes

- Namespace: `borla-backend`
- ConfigMap for non-sensitive runtime settings
- Secret for sensitive runtime settings
- Deployment with `replicas: 3`
- ClusterIP Service with `sessionAffinity: ClientIP`

## Important note for Socket.IO

The application uses in-memory Socket.IO state. A plain 3-pod deployment will work for HTTP traffic, but real-time events are only guaranteed within the pod that owns the socket connection.

`sessionAffinity: ClientIP` helps keep a client on the same pod, but it is not a full cross-pod Socket.IO adapter. If you need shared realtime rooms across all pods, add a Redis-backed Socket.IO adapter later.

## Prerequisites

- A container image pushed to a registry that your cluster can pull, or loaded locally in a local cluster such as Docker Desktop, kind, or minikube.
- A valid database and the required application secrets.

## Files

- [k8s/00-namespace.yaml](../k8s/00-namespace.yaml)
- [k8s/01-configmap.yaml](../k8s/01-configmap.yaml)
- [k8s/02-secret.yaml](../k8s/02-secret.yaml)
- [k8s/03-deployment.yaml](../k8s/03-deployment.yaml)
- [k8s/04-service.yaml](../k8s/04-service.yaml)

## Quick start

1. Build and push the image.

```bash
docker build -t borla-backend:latest .
docker tag borla-backend:latest <your-registry>/borla-backend:latest
docker push <your-registry>/borla-backend:latest
```

1. Update `k8s/03-deployment.yaml` with the image you pushed.
1. Replace the placeholder values in `k8s/02-secret.yaml`.
1. Apply the manifests.

```bash
kubectl apply -f k8s/00-namespace.yaml
kubectl apply -f k8s/01-configmap.yaml
kubectl apply -f k8s/02-secret.yaml
kubectl apply -f k8s/03-deployment.yaml
kubectl apply -f k8s/04-service.yaml
```

## Verify the rollout

```bash
kubectl get pods -n borla-backend
kubectl get svc -n borla-backend
kubectl rollout status deployment/borla-backend -n borla-backend
```

You should see 3 running pods for the backend deployment.

## Accessing the app

For local testing, forward the service port:

```bash
kubectl port-forward svc/borla-backend-service -n borla-backend 5000:5000
```

Then open:

```bash
http://localhost:5000
```

## For external access

Add either an `Ingress` resource or change the Service type to `LoadBalancer`, depending on the cluster.

For a detailed decision guide on which one to use and why, see [Kubernetes External Access: Ingress vs LoadBalancer](./KUBERNETES_EXTERNAL_ACCESS.md).
