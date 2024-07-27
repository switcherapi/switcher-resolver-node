***

<div align="center">
<b>Switcher Resolver Node</b><br>
Resolver Node for Component Switchers<br>
</div>

<div align="center">

[![Master CI](https://github.com/switcherapi/switcher-resolver-node/actions/workflows/master.yml/badge.svg?branch=master)](https://github.com/switcherapi/switcher-resolver-node/actions/workflows/master.yml)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=switcherapi_switcher-resolver-node&metric=alert_status)](https://sonarcloud.io/dashboard?id=switcherapi_switcher-resolver-node)
[![Known Vulnerabilities](https://snyk.io/test/github/switcherapi/switcher-resolver-node/badge.svg)](https://snyk.io/test/github/switcherapi/switcher-resolver-node)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Docker Hub](https://img.shields.io/docker/pulls/trackerforce/switcher-resolver-node.svg)](https://hub.docker.com/r/trackerforce/switcher-resolver-node)
[![Slack: Switcher-HQ](https://img.shields.io/badge/slack-@switcher/hq-blue.svg?logo=slack)](https://switcher-hq.slack.com/)

</div>

***

![Switcher API: Cloud-based Feature Flag API](https://github.com/switcherapi/switcherapi-assets/blob/master/logo/switcherapi_grey.png)

# About  

**Switcher Resolver Node** is the Feature Flag resolver that runs the Switcher evaluation criteria engine.

* * *

### Local setup
1. npm ci
2. Add .env-cmdrc file into the project directory (use '.env-cmdrc-template')
3. Replace values such as secret keys and URLs

# Quick start

Open Swagger UI by accessing the URL: http://localhost:3000/api-docs<br>
Or use Postman by importing either the OpenAPI json from http://localhost:3000/swagger.json or Postman Collection from "requests/Switcher Resolver Node*"