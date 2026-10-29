#!/bin/bash
set -e
cd "$(dirname "$0")"
# One release path: quick deployment must not bypass retention or compatibility checks.
exec ./deploy-to-firebase.sh "$@"
