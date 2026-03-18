#!/bin/bash
set -e
npm ci
npm --workspace @workspace/db run push
