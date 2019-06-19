# Spacegun

[![Version](https://img.shields.io/npm/v/spacegun.svg?style=flat)](https://www.npmjs.com/package/spacegun)
[![License](https://img.shields.io/npm/l/spacegun.svg?style=flat)](https://opensource.org/licenses/MIT)
[![Build Status](https://travis-ci.org/dvallin/spacegun.svg?branch=master)](https://travis-ci.org/dvallin/spacegun)
[![codecov](https://codecov.io/gh/dvallin/spacegun/branch/master/graph/badge.svg)](https://codecov.io/gh/dvallin/spacegun)
[![Sponsoring](https://img.shields.io/badge/Sponsored%20by-itemis-0E75BA.svg)](https://www.itemis.com)

**Version 0.1 has been released and Spacegun is battle proven at our own project.**

Straight-forward deployment management to get your docker images to kubernetes, without the headaches of fancy ui.

## Features

-   deployment pipelines as yaml
-   managing multiple kubernetes clusters
-   managing a single kubernetes cluster with namespaces
-   version controlled configuration
-   generating configuration from existing clusters
-   slack integration
-   some colorful cli
-   a static but informative ui
-   more cool features in the backlog

## Getting Started

There is a neat [tutorial](https://github.com/dvallin/spacegun/blob/master/docs/tutorial.md)
and a [medium article](https://medium.com/@mschuler/keep-your-kubernetes-save-with-spacegun-cf04d9109eeb)

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
  host: http://localhost
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
`server` gives hostname and port of the server (client uses both, server uses the port). Additionally spacegun can be started with the `--port` parameter so you can override this value.
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

`type` describes the type of the Pipeline Step. `planImageDeployment` will look into your cluster and compare the deployments in each namespace with the tag given. In this case, it will plan to update all deployments to the newest image tagged with `latest`. See the next section for more information about deploying using tags.

`onSuccess` defines the action that should be taken after this. `planImageDeployment` will be followed by the `apply1` step. The `applyDeployment` step will apply all previously planned deployments.

Here is an example of a job that deploys from a `develop` to a `live` environemt

```
cluster: k8s.live.my.cluster.com
start: "plan"
steps:
- name: "plan"
  type: "planClusterDeployment"
  cluster: "k8s.develop.my.cluster.com"
  onSuccess: "apply"
  onFailure: "rollback1"

- name: "apply"
  type: "applyDeployment"
  onSuccess: "snapshot1"
  onFailure: "rollback1"
```

The `planClusterDeployment` step will plan updates by looking into the develop cluster and comparing the versions running with the live cluster. Wherever there is a difference in the image tag or hash it will plan a deployment.

If `cron` is not present the server will not create a cronjob and the deployment needs to be manually run by a client.

#### Deploying to differing namespaces

If the namespaces in the clusters are not called the same, you can use the `planNamespaceDeployment` step, which allows you to provide a source and a target namespace. Deployments present in both namespaces will be compared and updated analogously to the `planClusterDeployment` step. Here is an example:

```yaml
cluster: k8s.live.my.cluster.com
start: 'plan'
steps:
    - name: 'plan'
      type: 'planNamespaceDeployment'
      cluster: 'k8s.prelive.my.cluster.com'
      source: 'namespace1'
      target: 'namespace2'
      onSuccess: 'apply'

    - name: 'apply'
      type: 'applyDeployment'
```

This will update all deployments on the live cluster in namespace2 which have more recent versions on the prelive cluster in namespace1.

A special case for this is the deployment in a different namespace inside the same cluster. For this you can either omit the `cluster` inside the step or fill it with the same url as the global `cluster`.

#### Deciding which tag to deploy

Spacegun will always check for image differences using tag _and_ image hash. So you if just want to deploy `latest` then do so like in the pipeline above. This will ensure that if you push a new image tagged with a specific tag, Spacegun will deploy it.

The `tag` field is not mandatory, however. If you leave it out Spacegun will then choose the lexicographically largest tag. So if you tag your images by unix timestamp, it will deploy the most recent tag. Granted, very implicitely. That is why there is also the `semanticTagExtractor` field that can either hold a regex or a plain string. Spacegun will extract the first match from this regex and use it as a sorting key. Then it will use the lexcographically largest tag using the sorting key. If you have this step:

```
- name: "semanticPlan"
  type: "planImageDeployment"
  semanticTagExtractor: /^\d{4}\-\d{1,2}\-\d{1,2}$
  onSuccess: "apply1"
```

Spacegun will extract a very simple Date format. Say you have tags `rev_98ac7cc9_2018-12-24`, `rev_5da58cc9_2018-12-25`, `rev_12ff8cff_2018-12-26`. Then Spacegun will extract the trailing dates and deploy the lexicographically largest tag using this extracted sorting key. Which is `rev_12af8cff_2018-12-26`.

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
    resources:
      - "deployment1"
      - "deployment2"
      - "deployment3"
      - "batch1"
  onSuccess: "apply1"
```

This planning step would only run for two namespaces and in each namespace only update the three deployments listed. Note that this makes sense if you do not have deployments that are uniquely named, else you could omit filtering by namespaces.

Note that once you use filtering in one deployment pipeline, you likely have to add filtering to all your deployments. It might be a good idea, to have such special deployments running in a separated namespace and you might even manage them using a dedicated Spacegun instance.

For `planNamespaceDeployment` you cannot filter on namespaces and Spacegun will tell you so if you try. Filtering on deployments is still possible.

#### Deploy only working clusters

You might want to only deploy clusters that meet certain criteria. For example you might check that all systems are healthy and the acceptance tests are green or some other metrics are fine. To tell Spacegun about your cluster state you can add a cluster probe step to your pipeline.

```
- name: "probe1"
  type: "clusterProbe"
  hook: "https://some.hook.com"
  timeout: 20000
  onSuccess: "plan1"
```

The `tag` is an endpoint that Spacegun will call using `GET` method. If it returns a status code 200, Spacegun will proceed with the `onSuccess` step. Else the step will fail and proceed with the `onFailure` step. The timeout is an optional field giving the timeout for the hook call in milliseconds. If no timeout is set, spacegun will not cancel the connection on its own.

### Git

All configuration files can be maintained in a git repository. Spacegun can be configured to poll for changes and will automatically load them while runing.

A git repository could have such a folder structure

```
.
├── config.yml
└── pipelines
│   ├── dev.yml
│   ├── live.yml
│   └── pre.yml
└─ artifacts
    └── ...
```

You probably do not want to have your Kubernetes config in version control, because it should be considered sensitive data for most users. You should rather generate one dynamically on startup of your node running Spacegun. If you are running on AWS you can use [kops]() for this.

## Example of a startup script

Install Node, Spacegun and create a user for Spacegun

```
#!/usr/bin/env bash

set -e
set -x

if [ "$(id -un)" != "root" ]; then
  exec sudo -E -u root "$0" "$@"
fi

export DEBIAN_FRONTEND=noninteractive
curl -sSL https://deb.nodesource.com/gpgkey/nodesource.gpg.key | apt-key add -
VERSION=node_8.x
DISTRO="$(lsb_release -s -c)"
echo "deb https://deb.nodesource.com/$VERSION $DISTRO main" | tee /etc/apt/sources.list.d/nodesource.list
echo "deb-src https://deb.nodesource.com/$VERSION $DISTRO main" | tee -a /etc/apt/sources.list.d/nodesource.list

apt-get update
apt-get install -y nodejs

npm install -g --unsafe-perm spacegun

# Create Spacegun user
useradd -d /var/lib/spacegun -U -M -r spacegun
```

Install Kubectl and Kops (if you need them)

```
# Install kubectl
curl -LO https://storage.googleapis.com/kubernetes-release/release/$(curl -s https://storage.googleapis.com/kubernetes-release/release/stable.txt)/bin/linux/amd64/kubectl
chmod +x ./kubectl
mv ./kubectl /usr/local/bin/kubectl

# Install kops
curl -LO https://github.com/kubernetes/kops/releases/download/$(curl -s https://api.github.com/repos/kubernetes/kops/releases/latest | grep tag_name | cut -d '"' -f 4)/kops-linux-amd64
chmod +x kops-linux-amd64
mv kops-linux-amd64 /usr/local/bin/kops
```

Creating a daemon and start Spacegun

```
cat > /etc/systemd/system/spacegun.service <<EOF
[Service]
ExecStart=/usr/bin/spacegun-server
Restart=always
StartLimitBurst=0
StartLimitInterval=60s
PermissionsStartOnly=true
User=spacegun
WorkingDirectory=/var/lib/spacegun/config

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable spacegun.service
systemctl start spacegun.service
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

-   **Maximilian Schuler** - _Initial work_ - [dvallin](https://github.com/dvallin)

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details

## Dependencies

-   [@kubernetes/client-node](https://github.com/kubernetes-client/javascript)
-   [axios](https://github.com/axios/axios)
-   [chalk](https://github.com/chalk/chalk)
-   [command-line-args](https://github.com/75lb/command-line-args)
-   [cron](https://github.com/kelektiv/node-cron)
-   [koa](https://github.com/koajs/koa)
-   [koa-body](https://github.com/dlau/koa-body)
-   [koa-router](https://github.com/alexmingoia/koa-router)
-   [koa-static](https://github.com/koajs/static)
-   [koa-views](https://github.com/queckezz/koa-views)
-   [lodash](https://github.com/lodash/lodash)
-   [mkdirp](https://github.com/substack/node-mkdirp)
-   [moment](https://github.com/moment/moment)
-   [ora](https://github.com/sindresorhus/ora)
-   [pug](https://github.com/pugjs/pug)
-   [simple-git](https://github.com/steveukx/git-js)
-   [rx](https://github.com/ReactiveX/rxjs)
