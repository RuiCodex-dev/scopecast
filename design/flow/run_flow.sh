#!/bin/bash
# Usage: run_flow.sh <prompts-file> <aspect> <outdir> <n>
# Retries on profile lock (shared machine; one gflow call at a time).
export GFLOW_CLI_LEASE_WAIT_SECONDS=600
for attempt in 1 2 3 4 5 6 7 8 9 10; do
  gflow image t2i --prompts-file "$1" --model nano-pro --aspect "$2" -n "$4" --out "$3" > "$3.log" 2>&1
  code=$?
  if [ $code -eq 0 ]; then echo "OK $1"; exit 0; fi
  if grep -q "ProfileLocked\|locked" "$3.log"; then echo "locked, retry $attempt"; sleep $((30 + RANDOM % 60)); continue; fi
  echo "FAILED $1 code $code"; tail -5 "$3.log"; exit $code
done
