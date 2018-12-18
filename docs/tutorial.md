# Tutorial
## Installation and local setup
To install spacegun, you can run `npm install spacegun`. This will install a standalone, a server and a client version of spacegun.

For starters, spacegun needs two things configured. A kubernetes cluster and a docker registry.

Let's create a docker registry locally and add an image to it! You can skip this part, if you already have a docker registry at your disposal

TODO ----> this does not play well with minikube, try to create it like [this](https://blog.hasura.io/sharing-a-local-registry-for-minikube-37c7240d0615)

```
docker run -d -p 5000:5000 --restart always --name registry registry:2
docker pull nginx
docker tag nginx localhost:5000/nginx
docker push docker.io/dvallin/nginx
```
The first line starts a docker registry and the last three lines publish an image to the local repository.

To configure spacegun against this docker registry, create a config.yml like this

```
docker: http://localhost:5000
```
If you run `spacegun images` from the same folder as this configuration file, you will get a list of all images in the repository. (Which is only the nginx image)

<---- TODO 


Spacegun deploys to a kubernetes, remember? So we should create one! If you already have a kubernetes running somewhere you can skip this part. Spacegun might pick up your kubeconfig automatically. For testing purposes we will use *minikube*. You can install it from [here](https://kubernetes.io/docs/tasks/tools/install-minikube/) (trust me, it is good fun).

Now start a cluster with `minikube start`. It will download what feels like the whole internet and start a bunch of images. If you list the kubernetes nodes you should see something like this

```
> kubectl config use-context minikube
Switched to context "minikube".

> kubectl get nodes
NAME       STATUS   ROLES    AGE   VERSION
minikube   Ready    master   2m    v1.10.0
```

Running `spacegun` will give you a output similar to

```
        /\ *
       /__\     Spacegun-CLI   version 0.0.23-SNAPSHOT
      /\  /
     /__\/      Space age deployment manager
    /\  /\
   /__\/__\     Usage: `spacegun <command> [options ...]`
  /\  /    \

configured clusters: minikube
configured image endpoint: http://localhost:5000
[...]
```
Spacegun is configured and ready to rock! In the next chapter we will look at how to create a new deployment from scratch using spacegun. But for now let us just create one with `kubectl` and update it with spacegun!

```
kubectl create -f https://k8s.io/examples/controllers/nginx-deployment.yaml
```

If you run `spacegun pods` now, you will see a lot of internal pods of kubernetes so add `namespaces: ["default"]` to your config.yml. This will whitelist kuberntes namespaces for spacegun. Now you should get something like

```
> spacegun pods
minikube :: default
pod name                                image url                               starts  status  age
nginx-deployment-86d59dd769-6vzkw       nginx:1.15.4                            0       up      16 minutes
nginx-deployment-86d59dd769-btdvr       nginx:1.15.4                            0       up      16 minutes
nginx-deployment-86d59dd769-hs9xr       nginx:1.15.4                            0       up      16 minutes
```

Now let us try to make an interactive deployment of the nginx image we previously pushed to the docker registry

```
Choose the target cluster
0: minikube
> 0
Choose the target namespace
0: default
> 0
Choose the target deployment
0: nginx-deployment
> 0
Choose the target image
0: latest
> 0
deploy localhost:5000/nginx:latest@sha256:87e9b6904b4286b8d41bba4461c0b736835fcc218f7ecbe5544b53fdd467189f into minikube::nginx-deployment
Answer `yes` to apply.
> yes
deployment name                         image url
nginx-deployment                        localhost:5000/nginx:latest@sha256:87e9b6904b4286b8d41bba4461c0b736835fcc218f7ecbe5544b53fdd467189f
```



## Migration and Bootstrapping
Ok, now that we have tested out spacegun a bit, let us configure an actual deployment pipeline! If you already have clusters running some deployments, just run `spacegun snapshot` and spacegun will create a representation of your whole cluster. This might look similar to:

```
> spacegun snapshot
minikube :: default
Loading snapshot
Saving snapshot

> tree artifacts
artifacts
└── minikube
    └── default
        └── deployments
            └── nginx-deployment.yml
```

If you edit the `nginx-deployement.yml` file (for example you could set `spec.replicas: 2`), spacegun will change the deployment if you run `spacegun apply`.