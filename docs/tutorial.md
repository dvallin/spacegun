# How to aim a Spacegun at your localhost

In this tutorial I will guide you through a fun little local setup with minikube and help you get your feet wet in creating and managing Kubernetes deployments with Spacegun.

## Installation and local setup

To install Spacegun, you can run `npm install -g spacegun`. This will install the standalone, server and client version of Spacegun.

For starters, Spacegun needs two things configured. A Kubernetes cluster and a Docker registry. If you already have a Kubernetes cluster and a Docker registry running somewhere you can skip this part.

### Start a Minikube instance

So let us start creating a Kubernetes cluster! Spacegun can pick up your kubeconfig automatically. For testing purposes we will use _Minikube_. You can find installation instructions in the [Minikube documentation](https://kubernetes.io/docs/tasks/tools/install-minikube/).

Now start a cluster with `minikube start`. It will download what feels like the whole internet and start a bunch of images. If it feels like the command is frozen, just give it some more time. Minikube does not perceive time they way you do. If the command still feels frozen, you are probably fine.

Switch to the Minikube context and try to list the Kubernetes nodes.

```
$ kubectl config use-context minikube
Switched to context "minikube".

$ kubectl get nodes
NAME       STATUS   ROLES    AGE   VERSION
minikube   Ready    master   2m    v1.10.0
```

### The docker registry and port forwarding

To create a Docker registry you could just run

```
$ docker run -d -p 5000:5000 --restart always --name registry registry:2
```

That creates a registry accessible via your console at `localhost:5000` but not from within the Kubernetes cluster. Instead of telling Kubernetes how to reach your machine, we will create the registry inside the Kubernetes cluster. The people from hasura.io have [a nice solution for that](https://blog.hasura.io/sharing-a-local-registry-for-minikube-37c7240d0615).

Just grab the `kube-registry.yaml` from [this gist](https://gist.github.com/coco98/b750b3debc6d517308596c248daf3bb1) and create the resources in your Kubernetes cluster.

```
$ kubectl create -f kube-registry.yaml
```

Let us push an image into the repository. The easiest way to do that (and one that also works on MacOS) is to ssh into minikube

```
$ minikube ssh
$ docker pull nginx
$ docker tag nginx localhost:5000/nginx
$ docker push localhost:5000/nginx
```

And you can establish a port-foward to reach the Docker registry from your machine.

```
$ registry=$(kubectl get po -n kube-system | grep kube-registry-v0 | awk '{print $1;}')
$ kubectl port-forward --namespace kube-system $registry 5000:5000
```

So your machine's `localhost:5000` will be forwarded to the docker registry in your kubernetes. You can even view the content of the repository in your [web browser](http://localhost:5000/v2/_catalog).

### Configure spacegun

Spacegun should automatically pick up your Kubernetes configuration. To configure Spacegun to use the Docker registry, create a `config.yml` like this

```
docker: http://localhost:5000
```

Running `spacegun` from the configuration directory will give you an output similar to

```
        /\ *
       /__\     Spacegun-CLI   version 0.0.23
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

Spacegun is configured and ready to rock! How you can create Kubernetes deployments using Spacegun's artifacts is described in the next chapter, but let's create one with `kubectl` manually first. We'll update it with Spacegun later!

```
$ kubectl create -f https://k8s.io/examples/controllers/nginx-deployment.yaml
```

If you run `spacegun pods` now, you will see a lot of internal Kubernetes pod, so add `namespaces: ["default"]` to your `config.yml`. This will whitelist Kubernetes namespaces for Spacegun. Now you should get something like

```
$ spacegun pods
minikube :: default
pod name                                starts  status  age         image url
nginx-deployment-86d59dd769-6vzkw       0       up      16 minutes  nginx:1.15.4
nginx-deployment-86d59dd769-btdvr       0       up      16 minutes  nginx:1.15.4
nginx-deployment-86d59dd769-hs9xr       0       up      16 minutes  nginx:1.15.4
```

If your nginx pods are listed as `down!` that is most likely because they are currently starting up. Using `kubectl` this is not all that obvious to see! Another nice metric is the `starts` column. This is the number of times Kubernetes had to restart the pod. If your pod is up but has a high restart count, you might have [OOM issues](https://en.wikipedia.org/wiki/Out_of_memory).

Now let us try to make an interactive deployment of the nginx image we previously pushed to the Docker registry.

```
$ spacegun deploy
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

And voilà as the French say, the pods are running the image we previously pushed into our local repository.

## Migration and Bootstrapping

Ok, now that we have tested out Spacegun a bit, let us configure an actual deployment pipeline! First let us take a snapshot of the cluster we are running.

```
$ spacegun snapshot
minikube :: default
Loading snapshot
Saving snapshot

$ tree artifacts
artifacts
└── minikube
    └── default
        └── deployments
            └── nginx-deployment.yml

3 directories, 1 file
```

Spacegun exported a representation of the `default` namespace of the `minikube` cluster. If you edit the `nginx-deployement.yml` file (for example to set `spec.replicas: 2`), Spacegun will change the deployment if you run `spacegun apply`. So adding environment variables and changing the replication factor is actually pretty straight-forward.

Now let us create a pipeline that will keep Kubernetes cluster in sync with your Docker registry. To do so we create a file `pipelines/deployment1.yml` relative to your configuration file.

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

You can test it with `spacegun run` but it will tell you that there is nothing to deploy since we already deployed the newest version of the `latest`tag of `nginx` manually in the previous chapter. So let's push a fresh image.

```
$ minikube ssh
$ docker pull ubuntu
$ docker tag ubuntu localhost:5000/nginx
$ docker push localhost:5000/nginx
```

Now there definitely is another image. `spacegun run` will yield something like

```
$ spacegun run
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

I spared you the obnoxious hashes in the image names, but the idea is there. You can run a deployment pipeline, it detects that there is another image with the `latest` tag in the Docker registry and Spacegun updates the deployment.

Now if you want to create a new deployment, you can create a new YAML file in the artifacts folder. You could also copy an existing file over and rename it. A simple `spacegun apply` will create the deployment in Kubernetes for you. The migration from your current cluster to a new one is also pretty easy. If you want to migrate from `minikube` to `actualCluster` you can rename the folder `artifacts/minikube` to `artifacts/actualCluster` and the next `spacegun apply` will create all resources in the new cluster.

## What to do next?

This is the end of the tutorial. I hope you got a better understanding of operating Spacegun. But there are a few more things to do. To fully automate Spacegun you will need to deploy a `spacegun-server` instance and have all your configuration files in a git repository. The [Spacegun README file](https://github.com/dvallin/spacegun/blob/master/README.md) will show you how to configure those. You can also want to integrate a [Slack hook](https://api.slack.com/incoming-webhooks).

In case you are interested in improving Spacegun: We have [some issues in our GitHub](https://github.com/dvallin/spacegun/issues) you might want to work on.
