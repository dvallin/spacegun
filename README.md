# Spacegun
[![Build Status](https://travis-ci.org/dvallin/spacegun.svg?branch=master)](https://travis-ci.org/dvallin/spacegun)
[![codecov](https://codecov.io/gh/dvallin/spacegun/branch/master/graph/badge.svg)](https://codecov.io/gh/dvallin/spacegun)

Straight-forward deployment management to get your docker images to kubernetes, without the headaches of fancy ui.

**This project is not quite stable yet. But it is going into a testing phase in our in-house project, so it might be soon**

## Features
- deployment pipelines as yaml
- managing multiple kubernetes clusters
- version controlled configuration
- generating configuration from existing clusters
- slack integration
- some colorful cli
- a static but informative ui
- more cool features in the backlog

## Getting Started

There is a neat [tutorial](https://github.com/dvallin/spacegun/blob/master/docs/tutorial.md)

## Installing

If you only want the cli you can install it with

```
npm install -g spacegun
```

and then run it from the console. You will have `spacegun`, `spg` and `spacegun-server` as commands available in your console. These are the standalone, client and server builds respectively.

### Build the sources

Just run 

```
yarn build
```

then you can run the cli with

```
node bin/spacegun
```

There is also a Dockerfile in the repo in case you want to run spacegun in a container.

### Three modes of operation

Spacegun comes in three flavors
1. Server (bin/spacegun-server)
2. Client (bin/spg)
3. Standalone (bin/spacegun)

The server build is meant to be deployed in an environment that can reach all your clusters and your image repository, but can also be reached by the clients. The server build runs cronsjobs, keeps caches of the current state of all resources and runs an HTTP Api (autogenerated messy rest).

The client build is meant to be run on developers consoles as a cli interface to the server.

The standalone build is just the client and server functionality compiled directly into one executable. So you can play around with your configurations before deploying to an actual environment.

### Configuring Spacegun

#### Config.yml
Spaceguns main configuration file is just a yml containing information about your cluster and image repository. By default Spacegun will look under `./config.yml` relative to its working directory.

A configuration may look like this

```
docker: https://my.docker.repository.com
artifact: artifactsFolder
pipelines: pipelinesFolder
kube: kube/config
slack: https://hooks.slack.com/services/SOMEFUNKY/ID
namespaces: ["service1", "service2"]
server:
  host: localhost
  port: 8080
git:
  remote: https://some.git
  cron: "0 */5 * * * MON-FRI"
```

`docker` gives a url of a docker repository  
`artifacts` folder for spacegun to put cluster snapshots  
`pipelines` folder for spacegun to load pipelines from  
`kube` gives a path to a kubernetes config file (relative to the config.yml)  
`slack` optional webhook to get notifactions of cluster updates  
`namespaces` gives a list of namespaces for spacegun to operate on.  
`server` gives hostname and port of the server (client uses both, server uses the port)  
`git` contains the path to the remote git where all configurations are kept. And the (optional) crontab configures how often the service should poll for configuration changes.

#### Pipelines

Spacegun is driven by deployment pipelines. A pipeline is configured as a `<pipelinename>.yml`. By default spacegun scans the `configPath/pipelines` folder relative to its configuration file for such files.

Here is an example of a pipeline that deploys the newest images that are tagged as `latest` from your docker registry to your `develop` kubernetes cluster
```
cluster: k8s.develop.my.cluster.com
cron: "0 */5 * * * MON-FRI"
start: "plan1"
steps:
- name: "plan1"
  type: "planImageDeployment"
  tag: "latest"
  onSuccess: "apply1"

- name: "apply1"
  type: "applyDeployment"
```
`cluster` is the url of your cluster  
`cron` is just a crontab. This one is defined to trigger the job every 5 minutes from Monday to Friday.  
`start` the step to start the execution of the pipeline.  
`steps` is a list of deployment steps. Please note: Spacegun will not validate semantical correctness of your pipeline. It will only check that you are not missing any filds or have typos in step types.  

`type` describes the type of the Pipeline Step. `planImageDeployment` will look into your cluster and compare the deployments in each namespace with the tag given. In this case it will plan to update all deployments that are not deploying the newest image tagged with `latest`. `applyDeployment` will apply all previously planned deployments. (Note: this distinction in planning and applying is very handy in manual execution via cli, or to implement manual aproval steps in a spacegun pipeline)    
`onSuccess` defines the action that should be taken after this. `planImageDeployment` will be followed by the `apply1` step

Here is an example of a job that deploys from a `develop` to a `live` environemt
```
cluster: k8s.live.my.cluster.com
start: "probe1"
steps:
- name: "probe1"
  type: "clusterProbe"
  hook: "https://some.hook.com"
  onSuccess: "deployImage"

- name: "plan1"
  type: "planClusterDeployment"
  cluster: "k8s.develop.my.cluster.com"
  onSuccess: "apply1"
  onFailure: "rollback1"

- name: "apply1"
  type: "applyDeployment"
  onSuccess: "snapshot1"
  onFailure: "rollback1"

- name: "snapshot1"
  type: "takeSnapshot"

- name: "rollback1"
  type: "rollback"
```
This pipeline has a lot more steps. The `planClusterDeployment` step will plan updates by looking into the develop cluster and comparing the versions running with the live cluster. Wherever there is a difference in the image tag or hash it will plan a deployment. (Note: deploying docker images via tag is deprecated. So it is best practice to deploy an immage tagged with `latest`, but deploy using image hashes)  
The steps `rollback`, `takeSnapshot` and `clusterProbe` are exemplary and will be available in future releases. Track their progress in issues [39](https://github.com/dvallin/spacegun/issues/39), [42](https://github.com/dvallin/spacegun/issues/42) and [43](https://github.com/dvallin/spacegun/issues/42)

If `cron` is not present the server will not create a cronjob and the deployment needs to be manually run by a client.

#### Deploy a subset of your cluster

The planning steps can be filtered on namespaces and deployments.
```
- name: "plan1"
  type: "planImageDeployment"
  tag: "latest"
  filter:
    namespaces:
      - "namespace1"
      - "namespace2"
    deployments:
      - "deployment1"
      - "deployment2"
      - "deployment3"
  onSuccess: "apply1"
```
This planning step would only run for two namespaces and in each namespace only update the three deployments listed. Note that this makes sense if you do not have deployments that are uniquely named, else you could omit filtering by namespaces.

Note that once you use filtering in one deployment pipeline, you likely have to add filtering to all your deployments. It might be a good idea, to have such special deployments running in a separated namespace and you might even manage them using a dedicated Spacegun instance.

### Git
All configuration files can be maintained in a git repository. Spacegun can be configured to poll for changes and will automatically load them while runing.

A git repository could have such a folder structure

```
.
├── config.yml  
├── jobs  
│   ├── dev.yml
│   ├── live.yml
│   └── pre.yml
└── kube
    └── config
```

## Cluster Snapshots

Running `spacegun snapshot` will download the current state of your cluster's deployments and save them as artifacts (yml files) in your artifacts folder (by default `configPath/artifacts`).

Now you can just update your deployments by committing changes of the artifacts into your config repository. Spacegun will then apply the changes on config reload.

If you want to apply local changes to your deployments configuration, run `spacegun apply`.

Note that spacegun will not apply changes to the deployment's image. This is where deployment jobs or the `spacegun deploy` command are for.

## Running the tests

run the tests with

```
yarn test
```

## Authors

* **Maximilian Schuler** - *Initial work* - [dvallin](https://github.com/dvallin)


## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details

## Dependencies

* [@kubernetes/client-node](https://github.com/kubernetes-client/javascript)
* [axios](https://github.com/axios/axios)
* [chalk](https://github.com/chalk/chalk)
* [command-line-args](https://github.com/75lb/command-line-args)
* [cron](https://github.com/kelektiv/node-cron)
* [koa](https://github.com/koajs/koa)
* [koa-body](https://github.com/dlau/koa-body)
* [koa-router](https://github.com/alexmingoia/koa-router)
* [koa-static](https://github.com/koajs/static)
* [koa-views](https://github.com/queckezz/koa-views)
* [lodash](https://github.com/lodash/lodash)
* [mkdirp](https://github.com/substack/node-mkdirp)
* [moment](https://github.com/moment/moment)
* [ora](https://github.com/sindresorhus/ora)
* [pug](https://github.com/pugjs/pug)
* [simple-git](https://github.com/steveukx/git-js)
* [rx](https://github.com/ReactiveX/rxjs)
