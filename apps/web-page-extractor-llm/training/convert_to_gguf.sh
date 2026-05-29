#!/usr/bin/env bash
# HF safetensors → GGUF Q4_K_M for Ollama. Run AFTER merging the LoRA
# adapter back into the base model with axolotl's merge_lora.
#
# Outputs:
#   training/output/merged/                  ← merged HF model
#   training/output/web-page-extractor-llm.gguf ← FP16 GGUF (intermediate)
#   training/output/web-page-extractor-llm.Q4_K_M.gguf ← shipped weight
#
# Prerequisites:
#   - llama.cpp cloned somewhere (LLAMA_CPP_DIR env or ./vendor/llama.cpp)
#   - llama.cpp built (`make` once is enough)
#
# Quantization choice:
#   Q4_K_M strikes the best size/quality balance for 7B on CPU. Use
#   Q5_K_M if you have RAM headroom (~25% more); use Q6_K only if the
#   model fits and you can afford the latency.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
OUT_DIR="${ROOT_DIR}/training/output"
MERGED_DIR="${OUT_DIR}/merged"
LLAMA_CPP_DIR="${LLAMA_CPP_DIR:-${ROOT_DIR}/vendor/llama.cpp}"
QUANT="${QUANT:-Q4_K_M}"
NAME="${NAME:-web-page-extractor-llm}"

if [[ ! -d "${MERGED_DIR}" ]]; then
  echo "ERROR: merged model not found at ${MERGED_DIR}." >&2
  echo "       Run: accelerate launch -m axolotl.cli.merge_lora training/axolotl_qlora.yaml" >&2
  exit 1
fi

if [[ ! -x "${LLAMA_CPP_DIR}/llama-quantize" && ! -x "${LLAMA_CPP_DIR}/build/bin/llama-quantize" ]]; then
  echo "ERROR: llama.cpp build not found at ${LLAMA_CPP_DIR}." >&2
  echo "       git clone https://github.com/ggerganov/llama.cpp ${LLAMA_CPP_DIR} && cd $_ && make -j" >&2
  exit 1
fi

QUANTIZE_BIN="${LLAMA_CPP_DIR}/llama-quantize"
[[ -x "${LLAMA_CPP_DIR}/build/bin/llama-quantize" ]] && QUANTIZE_BIN="${LLAMA_CPP_DIR}/build/bin/llama-quantize"

FP16_GGUF="${OUT_DIR}/${NAME}.fp16.gguf"
QUANT_GGUF="${OUT_DIR}/${NAME}.${QUANT}.gguf"

echo "[gguf] converting HF → FP16 GGUF"
python "${LLAMA_CPP_DIR}/convert_hf_to_gguf.py" \
  "${MERGED_DIR}" \
  --outfile "${FP16_GGUF}" \
  --outtype f16

echo "[gguf] quantizing → ${QUANT}"
"${QUANTIZE_BIN}" "${FP16_GGUF}" "${QUANT_GGUF}" "${QUANT}"

echo "[gguf] cleaning intermediate FP16"
rm -f "${FP16_GGUF}"

# Emit a Modelfile that Ollama can ingest at deploy time. start.sh
# picks this up via MODELFILE_PATH.
cat > "${OUT_DIR}/Modelfile" <<EOF
FROM ./${NAME}.${QUANT}.gguf

# Lock the system prompt at the model layer so every call inherits
# the schema-only contract even when the caller forgets to set it.
SYSTEM """You read web pages and extract structured data.

Given HTML (or extracted text) and a goal that includes a JSON schema, return ONLY a JSON object matching the schema. Use only facts present on the page; null any field you cannot verify; never invent values. If prior example outputs from the same site are attached, mirror their shape. No prose, no markdown fences — JSON only."""

PARAMETER temperature 0.1
PARAMETER top_p 0.9
PARAMETER num_ctx 32768
PARAMETER repeat_penalty 1.05
PARAMETER stop "</s>"
EOF

echo "[gguf] done"
echo "  weight:    ${QUANT_GGUF}"
echo "  modelfile: ${OUT_DIR}/Modelfile"
echo
echo "Next: copy both into the container build context (or upload to"
echo "a registry) and set MODEL_NAME + MODELFILE_PATH in Railway."
