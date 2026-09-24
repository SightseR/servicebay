# Weekly pg_dump → Cloud Storage, run as a Cloud Run Job. No SDK needed: uploads via the JSON API with the job's own identity.
FROM postgres:16-alpine
RUN apk add --no-cache curl
COPY backup.sh /backup.sh
RUN chmod +x /backup.sh
ENTRYPOINT ["/backup.sh"]
