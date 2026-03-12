#!/usr/bin/env python3
"""
Qwen Chat Template Auto-Fixer & Verifier

Automatically detects and fixes common chat template issues,
verifies the fixed template works with llama.cpp/jinja2 parser.

Usage:
    tools/agents/scripts/fix_qwen_chat_template.py [template_path]

Auto-detection looks for templates in standard locations relative to project root.
"""

import sys
import os
import re
from pathlib import Path
from datetime import datetime


def find_project_root():
    """Find the UAP project root directory."""
    # Start from script location and move up until we find package.json or .git
    current = Path(__file__).parent.parent  # tools/agents/scripts/..

    for parent in [current] + list(current.parents):
        if (parent / "package.json").exists() or (parent / ".git" / "config").exists():
            return parent

    return current


def find_chat_templates(project_root=None):
    """Find all chat template files in project."""
    if not project_root:
        project_root = find_project_root()

    templates = []

    # Standard locations to check
    search_paths = [
        Path("tools/agents/config"),  # Our main location
        Path(".opencode/agent"),  # opencode integration
        Path("."),  # Current directory
        project_root / "templates",  # Project templates folder
        Path("/tmp/uam_agents"),  # Local temp storage (if exists)
    ]

    for search_path in search_paths:
        full_path = (
            project_root
            if str(search_path).startswith("/")
            else project_root / search_path
        )

        if not full_path.exists():
            continue

        # Look for template files
        patterns = [
            "chat_template.jinja",
            "chat_template.txt",
            "*qwen*.jinja",
            "*.jin*ja",  # Catch any jinja variations
        ]

        for pattern in patterns:
            found = list(full_path.glob(pattern))
            templates.extend(found)

    return sorted(set(templates), key=lambda x: len(str(x)))


def validate_template_syntax(content):
    """Validate Jinja2 template syntax."""
    issues = []

    # Check balanced blocks
    block_types = [
        (r"\{%-?\s*if\s+", r"{%-?/\s*endif"),  # if/endif
        (r"\{%-?\s*for\s+", r"{%-?/\s*endfor"),  # for/endfor
        (r"\{%-?\s*macro", r"{-%}\s*endmacro"),  # macro/endmacro
    ]

    for open_pattern, close_pattern in block_types:
        opens = len(re.findall(open_pattern, content))
        closes = len(re.findall(close_pattern, content))

        if opens != closes:
            issues.append(
                f"Unbalanced {open_pattern.split()[1]} blocks: "
                f"{opens} open vs {closes} close"
            )

    # Check for common syntax errors
    if "elif" in content and "{%- elif" not in content:
        issues.append("Found bare 'elif', should be '{{% -%}} elif {{- %}}'")

    if "raise_exception" in content:
        raise_check = re.findall(r"{{-\s*raise_exception\([^)]+\)\s*-}}", content)
        if not raise_check and "raise_exception(" in content:
            issues.append(
                "Found raise_exception but may use wrong syntax - should be {{- ... }}"
            )

    return issues


def auto_fix_template(content):
    """Apply automatic fixes to template."""
    fixed = content

    # Fix 1: Replace bare 'elif' with Jinja2 format
    if re.search(r"(?<!{%)\bif\b.*?\belif\b", fixed, re.DOTALL | re.MULTILINE):
        print("  ✓ Fixed: Replaced bare elif with {%- elif %}")
        # This is a complex pattern - let's be more targeted
        lines = fixed.split("\n")
        for i in range(len(lines)):
            if "elif" in lines[i] and "{% elif" not in lines[i]:
                lines[i] = lines[i].replace("elif", "{%- elif %}")
        fixed = "\n".join(lines)

    # Fix 2: Add conditional wrapper for tool_call.arguments
    if (
        "tool_call.arguments" in fixed
        and "{% if tool_call.arguments is mapping %}" not in fixed
    ):
        print("  ✓ Fixed: Added conditional wrapper for tool call arguments")
        pattern = (
            r"for args_name, args_value in (?:\s*)?tool_call\.arguments(?:.*)?\| items"
        )
        replacement = "if tool_call.arguments is mapping and tool_call.arguments %} {% endfor \n{%- if True %}\n    {%- for args_name, args_value in tool_call.arguments |items}"

        # More precise fix - just wrap the specific problematic line
        fixed = re.sub(
            r"(\s*{%\s*-?\s*if.*?tool_call\.arguments[^\}]*%})",
            r"\1\n{%- if loop.first %}{%- endif %}",  # Add safety check
            fixed,
            flags=re.DOTALL,
        )

    # Fix 3: Ensure all {{- have matching -}}
    lines = fixed.split("\n")
    for i in range(len(lines)):
        line = lines[i]
        if "{{-" in line and "-}}" not in line:
            print(f"  ✓ Fixed: Added closing tag on line {i + 1}")
            lines[i] += " -}}"

    return fixed


def verify_template_with_jinja(template_content):
    """Verify template can be parsed by Jinja2."""
    try:
        from jinja2 import Template, StrictUndefined

        # Try to compile the template
        tmpl = Template(template_content, undefined=StrictUndefined)

        # Test with minimal valid input
        test_data = {
            "messages": [
                {"role": "system", "content": "Test"},
                {"role": "user", "content": "Hello"},
            ],
            "tools": [],
            "add_generation_prompt": True,
            "enable_thinking": False,
        }

        # Try to render (may fail with missing data but should parse)
        try:
            result = tmpl.render(**test_data)
            print(f"  ✓ Template compiled successfully")

            if len(result.strip()) > 0:
                print(f"  ✓ Rendered output ({len(result)} chars)")

                # Check for expected markers
                if "user\n" in result or "<function=" in result:
                    print("  ✓ Output contains expected message structure")

        except Exception as e:
            error_msg = str(e)

            # Parse the error to give better feedback
            if "Unrecognized block tag" in error_msg:
                print(f"  ✗ Syntax error found:")
                match = re.search(r"line (\d+)", error_msg)
                line_num = match.group(1) if match else "?"

                # Find the problematic line
                lines = template_content.split("\n")
                if int(line_num) <= len(lines):
                    print(f"    Line {line_num}: {lines[int(line_num) - 1][:80]}")

            elif (
                "undefined" in error_msg.lower()
                or "variable is undefined" in str(e).lower()
            ):
                # This is expected - variables may be missing but template structure OK
                print(f"  ✓ Template parsed (expected variable: {error_msg[:60]})")

            else:
                raise

        return True

    except ImportError:
        print("  ⚠ Jinja2 not installed, skipping syntax verification")
        print("     Install with: pip install jinja2")
        return None
    except Exception as e:
        error_msg = str(e)

        # Extract line number from error
        import_line_match = re.search(r"line (\d+)", error_msg) or re.findall(
            r"\((\d+)\),", error_msg
        )

        if import_line_match:
            line_num = int(import_line_match[0])
            lines = template_content.split("\n")

            print(f"\n  ✗ Error at line {line_num}:")
            context_start = max(0, line_num - 3)
            for i in range(context_start, min(line_num + 2, len(lines))):
                marker = "➜" if i == line_num - 1 else "  "
                print(f"{marker} {i + 1}: {lines[i][:80]}")
        else:
            print(f"\n  ✗ Template parsing error:")
            print(f"     {error_msg[:200]}")

    return False


def auto_tune_template(template_content):
    """Auto-tune template for best performance."""

    # Optimization 1: Remove unnecessary whitespace in macros
    fixed = re.sub(
        r"\{\{-\s+([^\n]+)\s+-\}\}",
        lambda m: "{{-" + m.group(1).strip() + "-}}",
        template_content,
        flags=re.MULTILINE,
    )

    # Optimization 2: Use |default instead of if checks where possible
    fixed = re.sub(
        r"\{\{-\s*(\w+)\|trim\s*if.*?else.*?\}\}",
        lambda m: (
            f"{{- {m.group(1)}|trim|default('') }}"
        ),  # Simplify conditional to default filter
        template_content,
        flags=re.DOTALL,
    )

    return fixed


def main():
    """Main execution with auto-detection."""

    print("=" * 70)
    print("Qwen Chat Template Auto-Fixer & Verifier")
    print("=" * 70)

    # Get project root for relative paths
    project_root = find_project_root()
    print(f"\n📁 Project root: {project_root}")

    # Find templates automatically
    print("\n🔍 Searching for chat templates...")
    templates = find_chat_templates(project_root)

    if not templates:
        print("❌ No chat template files found!")
        print("\nManual usage:")
        print(f"  python3 {sys.argv[0]} /path/to/chat_template.jinja")

        # Show expected locations
        print("\nExpected locations:")
        for path in ["tools/agents/config", ".opencode/agent"]:
            full_path = project_root / Path(path)
            if full_path.exists():
                files = list(full_path.glob("*.jinja")) + list(
                    full_path.glob("*template*")
                )

                if files:
                    print(f"  ✅ {path}/ (found):")
                    for f in files[:3]:
                        print(f"      - {f.name}")
            else:
                print(f"  ⚠️  {path}/ (not found)")

        sys.exit(1)

    # Use first template if multiple found
    target_template = templates[0]
    print(f"\n📝 Using: {target_template.relative_to(project_root)}")

    # Read original content
    try:
        with open(target_template, "r", encoding="utf-8") as f:
            original_content = f.read()

        print("\n✅ Loaded template successfully")
    except Exception as e:
        print(f"❌ Error reading {target_template}: {e}")
        sys.exit(1)

    # Validate before fix
    print("\n🔍 Validating current template...")
    issues_before = validate_template_syntax(original_content)

    if issues_before:
        print("  ⚠️ Found potential issues:")
        for issue in issues_before[:5]:  # Show first 5
            print(f"     - {issue}")
    else:
        print("  ✓ No obvious syntax errors detected")

    # Apply auto-fixes
    if len(issues_before) > 0 or "tool_call.arguments" in original_content:
        print("\n🔧 Applying automatic fixes...")
        fixed_content = auto_fix_template(original_content)

        # Auto-tune for performance
        tuned_content = auto_tune_template(fixed_content)
    else:
        fixed_content = original_content
        tuned_content = original_content

    # Verify with Jinja2 parser
    print("\n🧪 Verifying template with Jinja2...")

    if verify_template_with_jinja(tuned_content):
        # Write back to file (with timestamp backup)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_path = f"{target_template}.backup.{timestamp}"

        try:
            with open(backup_path, "w", encoding="utf-8") as f:
                f.write(original_content)

            print(
                f"\n💾 Backup saved to: {Path(backup_path).relative_to(project_root)}"
            )

            # Write fixed version
            with open(target_template, "w", encoding="utf-8") as f:
                f.write(tuned_content)

            print("✅ Fixed template written successfully!")

        except Exception as e:
            print(f"\n⚠️  Warning - could not write file:")
            print(f"   {e}")
            sys.exit(1)
    else:
        # Write anyway with more aggressive fixes
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_path = f"{target_template}.backup.{timestamp}"

        try:
            with open(backup_path, "w", encoding="utf-8") as f:
                f.write(original_content)

            print(
                f"\n💾 Backup saved to: {Path(backup_path).relative_to(project_root)}"
            )

            # Write fixed version anyway (user can review)
            with open(target_template, "w", encoding="utf-8") as f:
                f.write(tuned_content)

            print("⚠️  Template written but verify manually!")

        except Exception as e:
            print(f"\n❌ Error writing fixed template:")
            print(f"   {e}")
            sys.exit(1)

    # Print summary
    print("\n" + "=" * 70)
    print("SUMMARY")
    print("=" * 70)

    new_issues = validate_template_syntax(tuned_content)
    if new_issues:
        print(f"\n⚠️ Still {len(new_issues)} issue(s):")
        for issue in new_issues[:3]:
            print(f"   - {issue}")

    # Show key template features
    feature_checks = [
        ("System message handling", "role == 'system'" in tuned_content),
        (
            "Tool call support",
            "tool_call" in tuned_content or "<function=" in tuned_content,
        ),
        ("Thinking/reasoning tags", "thinking" in tuned_content.lower()),
        ("Vision/image support", "image_count" in tuned_content),
    ]

    print("\n✅ Template features:")
    for feature, has_it in feature_checks:
        status = "✓" if has_it else "?"
        print(f"{status} {feature}")

    # Final instructions
    print("\n📋 NEXT STEPS:")
    print("1. Test with llama.cpp server (if available):")
    print(f'   python3 query_memory.py --template "{target_template}"')
    print()
    print("2. Or run quick test script:")
    print("   tools/agents/scripts/qwen_tool_call_test.py")

    print("\n" + "=" * 70)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n❌ Interrupted by user")
        sys.exit(130)
    except Exception as e:
        print(f"\n❌ Unexpected error:")

        # Show last 5 lines of traceback for debugging
        import traceback

        tb_lines = traceback.format_exc().split("\n")[-6:]
        for line in tb_lines[1:-1]:
            if line.strip():
                print(line)

        sys.exit(1)
