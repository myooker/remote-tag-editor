#!/bin/sh
# Start the Crow backend in the background
web_tag_editor "$@" &

# Start nginx in the foreground (keeps container alive)
nginx -g "daemon off;"
