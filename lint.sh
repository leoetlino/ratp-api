#!/bin/bash
green='\033[0;32m'
red='\033[0;31m'
reset='\033[0m'

files=$(git diff --cached --name-only --diff-filter='ACMR' | grep '\.js\?$')

# Prevent ESLint help message if no files matched
if [[ $files = "" ]] ; then
  printf "${green}No files to lint${reset}\n"
  exit 0
fi

failed=0
for file in ${files}; do
  git show :$file | node_modules/.bin/eslint --stdin --stdin-filename $file
  if [[ $? != 0 ]] ; then
    failed=1
  fi
done;

if [[ $failed != 0 ]] ; then
  printf "${red}ESLint check failed, commit denied${reset}\n"
  exit $failed
fi

printf "${green}ESLint check passed, ${#files[@]} files linted${reset}\n"
exit 0
