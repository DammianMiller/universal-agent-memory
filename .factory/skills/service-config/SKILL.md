| name | description | argument-hint |
| --- | --- | --- |
| service-config | Use when tasks involve configuring servers, daemons, web servers, databases, or multi-service setups. Includes smoke testing protocol. | service name or configuration goal |

# Service Configuration

## Detection
Keywords: "configure", "server", "webserver", "service", "daemon", "nginx", "apache", "systemd", "docker", "database setup"

## Protocol
1. Identify all services needed and their dependency order
2. Check service status: `systemctl status <service>` or `docker ps`
3. Configure in dependency order (base -> dependent):
   - Database before app server
   - App server before reverse proxy
   - All services before integration test
4. Test each service individually before moving to next
5. Verify end-to-end after all configured

## Smoke Test (MANDATORY)
Services must be tested BEFORE claiming completion:
```bash
# Start service
systemctl start <service> || docker-compose up -d

# Test immediately
curl -s -o /dev/null -w "%{http_code}" http://localhost:<port>/health
# or
nc -z localhost <port> && echo "open" || echo "closed"

# Check logs for errors
journalctl -u <service> --no-pager -n 20 || docker logs <container> --tail 20
```

**NEVER complete without a successful smoke test.**

## Common Gotchas
- Port conflicts: check `ss -tlnp | grep <port>` before starting
- File permissions: config files often need specific ownership
- SELinux/AppArmor can silently block -- check `audit.log`
- DNS resolution inside containers differs from host
- WAL mode for SQLite: `PRAGMA journal_mode=WAL;` for concurrent access
