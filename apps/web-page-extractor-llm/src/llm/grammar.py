"""GBNF grammar from JSON Schema — for callers using llama.cpp directly.

Ollama's `"format": "json"` already enforces parseable JSON at the
sampler, so most schemas don't need this. Reach for it only when:
  - The output keeps drifting structurally despite the format hint, OR
  - You're running llama.cpp server (no built-in JSON mode) instead of
    Ollama.

Today this is a stub — wire `outlines.grammars.json` or `llama.cpp`'s
own `json-schema-to-grammar.py` when needed.
"""

from __future__ import annotations

from typing import Any


def schema_to_gbnf(schema: dict[str, Any]) -> str:  # pragma: no cover
    """Convert a JSON schema dict into a GBNF grammar string.

    Stub: returns a permissive object grammar. Plug in
    `outlines.grammars.json_schema_to_gbnf` (or llama.cpp's helper) for
    proper field-level constraints.
    """
    _ = schema  # noqa: F841
    return (
        "root   ::= object\n"
        'value  ::= object | array | string | number | "true" | "false" | "null"\n'
        'object ::= "{" ws ( string ws ":" ws value ( ws "," ws string ws ":" ws value )* )? ws "}"\n'
        'array  ::= "[" ws ( value ( ws "," ws value )* )? ws "]"\n'
        'string ::= "\\"" ([^"\\\\] | "\\\\" .)* "\\""\n'
        'number ::= "-"? ([0-9]+ ("." [0-9]+)?) ([eE] [+-]? [0-9]+)?\n'
        'ws     ::= [ \\t\\n]*\n'
    )
