const express = require("express");
const Groq = require("groq-sdk");

const router = express.Router();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

let extractor = null;
async function getExtractor() {
    if (!extractor) {
        const { pipeline } = await import("@xenova/transformers");
        extractor = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
    }
    return extractor;
}

function cosineSimilarity(vecA, vecB) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Extract purpose from a code file using Groq
async function extractPurpose(filename, code) {
    try {
        const response = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: [
                {
                    role: "system",
                    content:
                        "You extract the purpose of code. Return ONLY valid JSON (no markdown, no extra text): {\"what\": \"...\", \"why\": \"...\", \"dependencies\": [...]}",
                },
                {
                    role: "user",
                    content: `File: ${filename}\nCode:\n${code.slice(0, 5000)}`,
                },
            ],
            temperature: 0.1,
        });

        const text = response.choices[0].message.content.trim();
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        const jsonStr = jsonMatch ? jsonMatch[0] : text;
        const purpose = JSON.parse(jsonStr);
        return {
            filename,
            what: purpose.what || "",
            why: purpose.why || "",
            dependencies: purpose.dependencies || [],
        };
    } catch (err) {
        console.error(`Error extracting purpose from ${filename}:`, err.message);
        return {
            filename,
            what: "Unknown",
            why: "Failed to extract",
            dependencies: [],
        };
    }
}

// Parse plan into requirements using Groq
async function parsePlan(planText) {
    try {
        const response = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: [
                {
                    role: "system",
                    content:
                        "Break a plan into specific technical requirements. Return ONLY valid JSON (no markdown): [{\"objective\": \"...\", \"expected_artifacts\": [...], \"constraints\": [...]}]",
                },
                {
                    role: "user",
                    content: planText,
                },
            ],
            temperature: 0.1,
        });

        const text = response.choices[0].message.content.trim();
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        const jsonStr = jsonMatch ? jsonMatch[0] : text;
        const requirements = JSON.parse(jsonStr);
        return Array.isArray(requirements) ? requirements : [requirements];
    } catch (err) {
        console.error("Error parsing plan:", err.message);
        return [];
    }
}

// Align requirement against code purpose using Groq
async function alignRequirement(requirement, purpose) {
    try {
        const response = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: [
                {
                    role: "system",
                    content:
                        "You are an expert plan-code matcher. Given a requirement and code purpose, evaluate alignment. Return ONLY valid JSON (no markdown): {\"reasoning\": \"...\", \"confidence\": 0.85}",
                },
                {
                    role: "user",
                    content: `Requirement: ${JSON.stringify(requirement)}\n\nCode Purpose:\nWhat: ${purpose.what}\nWhy: ${purpose.why}\nDependencies: ${purpose.dependencies.join(", ")}\n\nCode file: ${purpose.filename}`,
                },
            ],
            temperature: 0.1,
        });

        const text = response.choices[0].message.content.trim();
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        const jsonStr = jsonMatch ? jsonMatch[0] : text;
        const result = JSON.parse(jsonStr);
        return {
            reasoning: result.reasoning || "",
            confidence: Math.min(Math.max(parseFloat(result.confidence) || 0, 0), 1),
        };
    } catch (err) {
        console.error("Error aligning requirement:", err.message);
        return { reasoning: "Alignment error", confidence: 0 };
    }
}

const fs = require("fs-extra");
const path = require("path");

async function getProjectFiles(dirPath, rootDir, arrayOfFiles = []) {
    const files = await fs.readdir(dirPath);
    
    for (const file of files) {
        if ([".git", "node_modules", "dist", "build", "venv", ".env", "target", "vendor"].includes(file)) continue;
        
        const fullPath = path.join(dirPath, file);
        const stat = await fs.stat(fullPath);
        
        if (stat.isDirectory()) {
            await getProjectFiles(fullPath, rootDir, arrayOfFiles);
        } else {
            const ext = path.extname(file).toLowerCase();
            if ([".js", ".jsx", ".ts", ".tsx", ".py", ".go", ".java", ".rb", ".php", ".rs", ".c", ".cpp"].includes(ext)) {
                arrayOfFiles.push({
                    fullPath,
                    relative: path.relative(rootDir, fullPath)
                });
            }
        }
    }
    return arrayOfFiles;
}

// POST /api/intent-graph/align
router.post("/align", async (req, res) => {
    const { planText, repoPath } = req.body;

    if (!planText || !planText.trim()) {
        return res.status(400).json({ error: "Plan text required" });
    }

    if (!repoPath) {
        return res.status(400).json({ error: "repoPath required" });
    }

    if (!process.env.GROQ_API_KEY) {
        return res.status(500).json({ error: "GROQ_API_KEY not set" });
    }

    try {
        // Step 1: Get actual files from the repo
        const allFiles = await getProjectFiles(repoPath, repoPath);
        
        // Limit to first 50 files for performance in this demo/MVP
        const selectedFiles = allFiles.slice(0, 50);
        
        const purposes = await Promise.all(
            selectedFiles.map(async (f) => {
                const code = await fs.readFile(f.fullPath, "utf8");
                return extractPurpose(f.relative, code);
            })
        );

        // Step 2: Parse plan into requirements
        const requirements = await parsePlan(planText);

        if (!Array.isArray(requirements) || requirements.length === 0) {
            return res.json({
                success: true,
                requirements: 0,
                results: [],
                message: "No requirements found in plan",
            });
        }

        // Pre-compute embeddings for code purposes
        const ext = await getExtractor();
        for (const purpose of purposes) {
            if (!purpose.embedding) {
                const textToEmbed = `${purpose.filename} ${purpose.what} ${purpose.why} ${purpose.dependencies.join(" ")}`;
                const output = await ext(textToEmbed, { pooling: "mean", normalize: true });
                purpose.embedding = Array.from(output.data);
            }
        }

        // Step 3: Align each requirement against all code purposes
        const results = [];
        for (const reqObj of requirements) {
            const reqText = (reqObj.objective || "") + " " + (reqObj.expected_artifacts || []).join(" ");
            const reqOutput = await ext(reqText, { pooling: "mean", normalize: true });
            const reqEmbedding = Array.from(reqOutput.data);

            let candidates = [];
            for (const purpose of purposes) {
                const sim = cosineSimilarity(reqEmbedding, purpose.embedding);
                candidates.push({ similarity: sim, purpose });
            }

            candidates.sort((a, b) => b.similarity - a.similarity);
            const topCandidates = candidates.slice(0, 3);
            
            let bestMatch = null;
            let bestConfidence = 0;
            let bestCandidateList = [];

            for (const candidate of topCandidates) {
                const alignment = await alignRequirement(reqObj, candidate.purpose);
                const finalConfidence = (candidate.similarity * 0.3) + (alignment.confidence * 0.7);
                
                bestCandidateList.push({
                    filename: candidate.purpose.filename,
                    confidence: finalConfidence,
                    reasoning: alignment.reasoning,
                });

                if (finalConfidence > bestConfidence) {
                    bestConfidence = finalConfidence;
                    bestMatch = {
                        filename: candidate.purpose.filename,
                        reasoning: alignment.reasoning,
                        confidence: finalConfidence,
                    };
                }
            }

            let action = "flag";
            if (bestConfidence >= 0.85) action = "auto-accept";
            else if (bestConfidence >= 0.7) action = "review";

            results.push({
                requirement: reqObj.objective || "Unnamed Requirement",
                matchedFile: bestMatch?.filename || "No suitable match",
                explanation: bestMatch?.reasoning || "No matching code pattern identified.",
                confidence: bestConfidence,
                action: action,
                allCandidates: bestCandidateList,
                overridden: false,
            });
        }

        return res.json({
            success: true,
            requirements: requirements.length,
            results: results,
        });
    } catch (err) {
        console.error("Intent graph alignment error:", err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

