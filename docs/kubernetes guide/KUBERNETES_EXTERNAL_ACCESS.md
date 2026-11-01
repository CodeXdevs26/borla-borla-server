# Kubernetes External Access: Ingress vs LoadBalancer

This guide explains how to expose the backend outside the cluster and which option to use.

## Short answer

- Use **Ingress** for most production setups.
- Use **Service type LoadBalancer** for quick/simple exposure or when you only have one public service.

## What each option does

### Option 1: Ingress

Ingress is an HTTP/HTTPS entry layer for your cluster.

You define rules like:

- Host: `api.example.com`
- Path: `/`
- Target service: `borla-backend-service:5000`

Why it is used:

- Central routing for many services behind one public endpoint.
- TLS termination (HTTPS certificates) in one place.
- Cleaner production architecture and easier domain/path management.

Important:

- Ingress needs an **Ingress Controller** (NGINX, Traefik, etc.) running in the cluster.
- In many environments, the controller itself is exposed by a LoadBalancer service.

### Option 2: Service type LoadBalancer

LoadBalancer exposes one service directly with an external IP or hostname.

Why it is used:

- Very simple and fast to set up.
- Good for testing, PoCs, or a single backend service.

Trade-offs:

- No built-in host/path routing across multiple apps.
- TLS/domain management is usually repeated per service.
- Cost can increase if each service gets its own cloud load balancer.

## Which one is needed for Borla backend?

### Local development clusters

- If using Docker Desktop, kind, or minikube, start with `kubectl port-forward`.
- If you want domain-like routing locally, use Ingress with a local controller.
- `LoadBalancer` may not work directly unless your local setup provides one (for example, minikube tunnel or MetalLB).

### Cloud managed clusters (EKS, GKE, AKS)

- For production and multiple services, use **Ingress**.
- For a single public API and fastest path, **LoadBalancer** is acceptable.

## Practical recommendation

For Borla backend in production:

1. Keep `borla-backend-service` as `ClusterIP`.
2. Deploy an Ingress Controller.
3. Add an Ingress resource for your API host.
4. Configure TLS certificate on the Ingress.

This gives better scalability, cleaner URL/TLS handling, and easier future expansion.

## Minimal examples

### A) Expose with LoadBalancer

```yaml
apiVersion: v1
kind: Service
metadata:
  name: borla-backend-service
  namespace: borla-backend
spec:
  type: LoadBalancer
  selector:
    app: borla-backend
  ports:
    - port: 5000
      targetPort: 5000
```

### B) Expose with Ingress (service stays ClusterIP)

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: borla-backend-ingress
  namespace: borla-backend
spec:
  ingressClassName: nginx
  rules:
    - host: api.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: borla-backend-service
                port:
                  number: 5000
```

## Decision checklist

Choose **Ingress** if:

- You need HTTPS/domain/path routing.
- You expect multiple services.
- You want production-grade traffic management.

Choose **LoadBalancer** if:

- You need a quick external endpoint now.
- You only have one service and want minimal setup.
