#!/bin/sh
# Start the Crow backend in the background
web_tag_editor "$@" &

# Start inotifywatch for /music deletions
inotifywait -m -r -e delete /music --format '%T|%w%f' --timefmt '%Y-%m-%d %H:%M:%S' 2>/dev/null | while IFS='|' read -r ts path; do
    echo "($ts) [INOTIFY ] deleted: $path"
    curl -s -X POST http://localhost:18080/api/events/delete \
        -H 'Content-Type: application/json' \
        -d "{\"event\":\"delete\",\"timestamp\":\"$ts\",\"path\":\"$path\"}" &
done &

# Start nginx in the foreground (keeps container alive)
nginx -g "daemon off;"