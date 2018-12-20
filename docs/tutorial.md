# How to aim a Spacegun at your localhost
In this tutorial I will guide you through a fun little local setup with minikube and help you get your feet wet in creating and managing Kubernetes deployments with Spacegun.
## Installation and local setup
To install Spacegun, you can run `npm install -g spacegun`. This will install a standalone, a server and a client version of Spacegun.

For starters, Spacegun needs two things configured. A kubernetes cluster and a docker registry. If you already have a kubernetes and a docker registry running somewhere you can skip this part. 

### Start a minikube instance
So let us start creating a kubernetes cluster! Spacegun might pick up your kubeconfig automatically. For testing purposes we will use *minikube*. You can install it from [here](https://kubernetes.io/docs/tasks/tools/install-minikube/).

Now start a cluster with `minikube start`. It will download what feels like the whole internet and start a bunch of images. If it feels like the command is frozen, just give it some more time. Minikube does not perceive time they way you do. If the command still feels frozen, you are probably fine.

Try to list the kubernetes nodes.

```
> kubectl config use-context minikube
Switched to context "minikube".

> kubectl get nodes
NAME       STATUS   ROLES    AGE   VERSION
minikube   Ready    master   2m    v1.10.0
```

### The docker registry and port forwarding

To create a docker registry you could just run

```
docker run -d -p 5000:5000 --restart always --name registry registry:2`
```

That would create a docker registry accessible via your console at `localhost:5000` but not from within the kubernetes cluster. Instead of telling kuberntes how to reach your machine, we will create a docker registry inside kubernetes. The people from hasura.io have a nice [solution](https://blog.hasura.io/sharing-a-local-registry-for-minikube-37c7240d0615) for that.

Just grap the `kube-registry.yaml` from [this](https://gist.github.com/coco98/b750b3debc6d517308596c248daf3bb1) gist and create it in your Kubernetes

```
kubectl create -f kube-registry.yaml
```

Let us push an image into the repository. The easiest way to do that (and one that also works on MacOS) is to ssh into minikube

```
minkube ssh
docker pull nginx
docker tag nginx localhost:5000/nginx
docker push localhost:5000/nginx
```

Now you can establish the a port-foward 

```
kubectl port-forward --namespace kube-system \ 
   $(kubectl get po -n kube-system | grep kube-registry-v0 | \
   awk '{print $1;}') 5000:5000
```
So your machine's `localhost:5000` will be forwarded to the docker registry in your kubernetes. Now you can even view the content of the repository in your [browser](http://localhost:5000/v2/_catalog).

### Configure spacegun

Spacegun should automatically pick up your Kubernetes configuration. To configure Spacegun against the docker registry, create a config.yml like this

```
docker: http://localhost:5000
```

Running `spacegun` from the directory of the configuration, will give you an output similar to

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

## Deploy things

Spacegun is configured and ready to rock! How you can create Kubernetes deployments using Spaceguns artifacts is described in the next chapter, but let us create one with manually with `kubectl` for now. Will update it with spacegun afterwards!

```
kubectl create -f https://k8s.io/examples/controllers/nginx-deployment.yaml
```

If you run `spacegun pods` now, you will see a lot of internal pods of kubernetes so add `namespaces: ["default"]` to your config.yml. This will whitelist kuberntes namespaces for Spacegun. Now you should get something like

```
> spacegun pods
minikube :: default
pod name                                starts  status  age         image url                               
nginx-deployment-86d59dd769-6vzkw       0       up      16 minutes  nginx:1.15.4                           
nginx-deployment-86d59dd769-btdvr       0       up      16 minutes  nginx:1.15.4                            
nginx-deployment-86d59dd769-hs9xr       0       up      16 minutes  nginx:1.15.4                           
```

If your `nginx` pods are listed as `down!` that is because they are actually down and currently starting up. Using kubectl this is not all that obvious to see! Another nice metric is the `starts` column. This is the number of times kubernetes had to restart the pod. If your pod is up but has been restarted too often lately you might have [OOM](https://en.wikipedia.org/wiki/Out_of_memory) issues.

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

And voilà as the french say, the pods are running the image we previously pushed into our local repository. 

## Migration and Bootstrapping
Ok, now that we have tested out spacegun a bit, let us configure an actual deployment pipeline! First let us take a snapshot of the cluster we are running.

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

Spacegun created a representation of the `minikube` cluster. If you edit the `nginx-deployement.yml` file (for example you could set `spec.replicas: 2`), Spacegun will change the deployment if you run `spacegun apply`. So adding environment variables and changiing the replication factor is actually pretty straight-forward.

Now let us create a Pipeline that will keep the docker registry in sync with your kubernetes cluster. To do so we create a file `pipelines/deployment1.yml` relative to your configuration file.

```
cluster: minikube
start: "planStep"
steps:
- name: "planStep"
  type: "planImageDeployment"
  tag: "latest"
  onSuccess: "applyStep"
- name: "applyStep"
  type: "applyDeployment"
  onSuccess: "snapshot1"
```

You can try it out with `spacegun run` but it will tell you that there is nothing to deploy since we already deployed the newest version of `nginx` manually in the previous chapter. So let's push a fresh image.

```
minikube ssh
docker pull ubuntu
docker tag ubuntu localhost:5000/nginx
docker push localhost:5000/nginx
```
Now there is definitely another image. `spacegun run` will yield something like

```
> spagun run
Choose the target pipeline
0: deployment1
> 0
planning image deployment nginx-deployment in deployment1
planning finished. 1 deployments are planned.
planned deployment deployment1
nginx-deployment localhost:5000/nginx:latest@someHash => localhost:5000/nginx:latest@someOtherHash
Answer `yes` to apply.
> yes
sucessfully updated nginx-deployment with image
 {"url":"localhost:5000/nginx:latest@sha256: someOtherHash","name":"nginx"}
```

I spared you the obnoxious hashes in the image names, but the idea is there. You could run a deployment pipeline, it detected that there is another image with the `latest` tag in the docker registry and Spacegun updated the deployment.

Now if you want to create a new deployment, you would create a new YAML file in the artifacts folder. You could also copy an existing file over and rename it. A simple `spacegun apply` will create the deployment in Kubernetes for you. Migration from your current cluster to a new one is also pretty easy. If you would migrate from `minikube` to `actualCluster` you would rename the folder `artifacts/minikube` to `artifacts/actualCluster` and the next `spacegun apply` will create all resources in the new cluster.

## What to do next?
This is the end of this tutorial. I hope you got a better understanding of operating Spacegun. But there are a few more things to do. To fully automate Spacegun you will need to deploy a `spacegun-server` instance and have all your configuration files in a git repository. The [README](https://github.com/dvallin/spacegun/blob/master/README.md) should show you how to configure those. You might also want to integrate a [Slack hook](https://api.slack.com/incoming-webhooks) as soon as possible.

We also have [issues](https://github.com/dvallin/spacegun/issues) you might want to work on. 
