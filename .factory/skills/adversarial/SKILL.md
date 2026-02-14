| name | description | argument-hint |
| --- | --- | --- |
| adversarial | Use when tasks involve bypassing filters, breaking security controls, exploiting vulnerabilities, or crafting adversarial inputs. Requires attacker mindset. | target filter/protection to bypass |

# Adversarial Thinking

## Detection
Keywords: "bypass", "break", "exploit", "circumvent", "evade", "filter", "XSS", "injection", "sanitize"

## Protocol
1. **Identify the defense mechanism** -- read the filter/validator source code
2. **Flip perspective**: not "how to use correctly" but "how to break it"
3. **Enumerate attack vectors** systematically:

### Attack Vector Checklist
1. Case variation: `<ScRiPt>`, `SELECT` vs `select`
2. Encoding: URL encode (`%3C`), HTML entities (`&#60;`), Unicode (`\u003c`)
3. Null bytes: `%00` to truncate strings
4. Double encoding: `%253C` -> `%3C` -> `<`
5. Context breaking: close existing tag/string before injecting
6. Event handlers: `onerror=`, `onload=`, `onfocus=`
7. Alternative syntax: template literals, `eval()`, `Function()`
8. Whitespace tricks: tabs, newlines, zero-width characters
9. Protocol handlers: `javascript:`, `data:`, `vbscript:`
10. Mutation XSS: HTML parser normalization differences

## Rules
- Test EACH vector until one works -- do not stop at first failure
- When building defense (not attack): ALWAYS use allow-list, never deny-list
- Use established security libraries (DOMPurify, bleach, parameterized queries)
- Document which vectors were tried and why they failed/succeeded
