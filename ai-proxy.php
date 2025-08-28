<?php
/**
 * HorizonSync AI Proxy
 * Secure backend for AI workflow optimization requests
 * 
 * This proxy handles AI requests for team optimization, hiring recommendations,
 * and workflow analysis while maintaining security and rate limiting.
 */

// ===== CONFIGURATION =====
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

// Environment configuration
$config = [
    'api_key' => getenv('Put your api key bro') ?: '',
    'rate_limit_per_hour' => 50,
    'rate_limit_per_day' => 500,
    'max_prompt_length' => 10000,
    'timeout' => 30,
    'debug_mode' => getenv('DEBUG') === 'true'
];

// ===== SECURITY & VALIDATION =====
function validateRequest() {
    global $config;
    
    // Check API key
    if (empty($config['api_key'])) {
        return ['error' => 'AI service not configured', 'code' => 503];
    }
    
    // Only allow POST requests
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        return ['error' => 'Only POST requests allowed', 'code' => 405];
    }
    
    // Validate content type
    $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
    if (strpos($contentType, 'application/json') === false) {
        return ['error' => 'Content-Type must be application/json', 'code' => 400];
    }
    
    return null; // Valid request
}

function validateInput($data) {
    global $config;
    
    // Check required fields
    if (!isset($data['prompt']) || empty(trim($data['prompt']))) {
        return ['error' => 'Prompt is required', 'code' => 400];
    }
    
    // Check prompt length
    $prompt = trim($data['prompt']);
    if (strlen($prompt) > $config['max_prompt_length']) {
        return ['error' => 'Prompt too long', 'code' => 413];
    }
    
    // Basic content filtering
    $bannedKeywords = ['hack', 'exploit', 'malware', 'illegal', 'harmful'];
    $lowerPrompt = strtolower($prompt);
    
    foreach ($bannedKeywords as $keyword) {
        if (strpos($lowerPrompt, $keyword) !== false) {
            return ['error' => 'Content not allowed', 'code' => 400];
        }
    }
    
    return null; // Valid input
}

// ===== RATE LIMITING =====
function checkRateLimit() {
    global $config;
    
    $clientIp = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    $tempDir = sys_get_temp_dir();
    $now = time();
    
    // Hourly rate limit
    $hourFile = $tempDir . '/hs_rate_h_' . md5($clientIp);
    $hourData = @json_decode(file_get_contents($hourFile), true) ?: ['count' => 0, 'expiry' => 0];
    
    if ($now > $hourData['expiry']) {
        $hourData = ['count' => 0, 'expiry' => $now + 3600];
    }
    
    if ($hourData['count'] >= $config['rate_limit_per_hour']) {
        return ['error' => 'Rate limit exceeded (hourly)', 'code' => 429, 'retry_after' => $hourData['expiry'] - $now];
    }
    
    // Daily rate limit
    $dayFile = $tempDir . '/hs_rate_d_' . md5($clientIp);
    $dayData = @json_decode(file_get_contents($dayFile), true) ?: ['count' => 0, 'expiry' => 0];
    
    if ($now > $dayData['expiry']) {
        $dayData = ['count' => 0, 'expiry' => $now + 86400];
    }
    
    if ($dayData['count'] >= $config['rate_limit_per_day']) {
        return ['error' => 'Rate limit exceeded (daily)', 'code' => 429, 'retry_after' => $dayData['expiry'] - $now];
    }
    
    // Update counters
    $hourData['count']++;
    file_put_contents($hourFile, json_encode($hourData), LOCK_EX);
    
    $dayData['count']++;
    file_put_contents($dayFile, json_encode($dayData), LOCK_EX);
    
    return null; // Rate limit OK
}

// ===== AI PROMPT OPTIMIZATION =====
function buildOptimizedPrompt($userPrompt, $context) {
    $systemPrompt = "You are an expert global team coordination advisor for HorizonSync. " .
                   "Your role is to provide strategic recommendations for optimizing distributed teams across time zones.\n\n";
    
    // Add context if provided
    if (!empty($context)) {
        $systemPrompt .= "Current Team Context:\n";
        
        if (isset($context['teamStructure']) && is_array($context['teamStructure'])) {
            $systemPrompt .= "Team Locations:\n";
            foreach ($context['teamStructure'] as $location) {
                $city = $location['city'] ?? 'Unknown';
                $role = $location['role'] ?? 'Team';
                $size = $location['teamSize'] ?? 1;
                $start = $location['workHours']['start'] ?? 9;
                $end = $location['workHours']['end'] ?? 17;
                
                $systemPrompt .= "- {$city}: {$role} team, {$size} members, work hours {$start}:00-{$end}:00\n";
            }
        }
        
        if (isset($context['currentCoverage'])) {
            $systemPrompt .= "Current Coverage: {$context['currentCoverage']}/24 hours\n";
        }
        
        if (isset($context['handoffEfficiency'])) {
            $systemPrompt .= "Handoff Efficiency: {$context['handoffEfficiency']}%\n";
        }
        
        $systemPrompt .= "\n";
    }
    
    $systemPrompt .= "Guidelines for responses:\n" .
                    "1. Focus on actionable, specific recommendations\n" .
                    "2. Consider timezone impact on team productivity\n" .
                    "3. Suggest optimal work hour overlaps for handoffs\n" .
                    "4. Recommend strategic hiring locations\n" .
                    "5. Provide clear implementation steps\n" .
                    "6. Keep responses concise but comprehensive\n\n" .
                    "User Request: {$userPrompt}\n\n" .
                    "Provide a strategic response with specific recommendations:";
    
    return $systemPrompt;
}

// ===== GEMINI AI INTEGRATION =====
function callGeminiAPI($prompt) {
    global $config;
    
    $apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' . $config['api_key'];
    
    $requestBody = [
        'contents' => [
            [
                'parts' => [
                    ['text' => $prompt]
                ]
            ]
        ],
        'generationConfig' => [
            'temperature' => 0.7,
            'topP' => 0.9,
            'topK' => 40,
            'maxOutputTokens' => 2048,
            'candidateCount' => 1
        ],
        'safetySettings' => [
            [
                'category' => 'HARM_CATEGORY_HARASSMENT',
                'threshold' => 'BLOCK_MEDIUM_AND_ABOVE'
            ],
            [
                'category' => 'HARM_CATEGORY_HATE_SPEECH',
                'threshold' => 'BLOCK_MEDIUM_AND_ABOVE'
            ],
            [
                'category' => 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
                'threshold' => 'BLOCK_MEDIUM_AND_ABOVE'
            ],
            [
                'category' => 'HARM_CATEGORY_DANGEROUS_CONTENT',
                'threshold' => 'BLOCK_MEDIUM_AND_ABOVE'
            ]
        ]
    ];
    
    $ch = curl_init($apiUrl);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($requestBody),
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'User-Agent: HorizonSync/1.0'
        ],
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_TIMEOUT => $config['timeout'],
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_MAXREDIRS => 3
    ]);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);
    
    if ($curlError) {
        return ['error' => 'Connection failed: ' . $curlError, 'code' => 502];
    }
    
    if ($httpCode !== 200) {
        $errorData = json_decode($response, true);
        $errorMessage = $errorData['error']['message'] ?? 'Unknown API error';
        return ['error' => 'AI API error: ' . $errorMessage, 'code' => $httpCode];
    }
    
    $decodedResponse = json_decode($response, true);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        return ['error' => 'Invalid response format', 'code' => 502];
    }
    
    return $decodedResponse;
}

// ===== RESPONSE PROCESSING =====
function processAIResponse($apiResponse) {
    if (!isset($apiResponse['candidates']) || empty($apiResponse['candidates'])) {
        return ['error' => 'No response generated', 'code' => 500];
    }
    
    $candidate = $apiResponse['candidates'][0];
    
    if (!isset($candidate['content']['parts'][0]['text'])) {
        return ['error' => 'Empty response content', 'code' => 500];
    }
    
    $responseText = $candidate['content']['parts'][0]['text'];
    
    // Process and structure the response
    $processedResponse = [
        'success' => true,
        'response' => [
            'text' => $responseText,
            'type' => detectResponseType($responseText),
            'suggestions' => extractSuggestions($responseText),
            'metadata' => [
                'timestamp' => date('c'),
                'model' => 'gemini-1.5-flash',
                'tokens' => estimateTokenCount($responseText)
            ]
        ]
    ];
    
    return $processedResponse;
}

function detectResponseType($text) {
    $lowerText = strtolower($text);
    
    if (strpos($lowerText, 'coverage') !== false || strpos($lowerText, '24-hour') !== false) {
        return 'coverage_analysis';
    } elseif (strpos($lowerText, 'hire') !== false || strpos($lowerText, 'hiring') !== false) {
        return 'hiring_recommendation';
    } elseif (strpos($lowerText, 'handoff') !== false || strpos($lowerText, 'transition') !== false) {
        return 'handoff_optimization';
    } elseif (strpos($lowerText, 'meeting') !== false || strpos($lowerText, 'schedule') !== false) {
        return 'meeting_optimization';
    } else {
        return 'general_advice';
    }
}

function extractSuggestions($text) {
    $suggestions = [];
    
    // Extract actionable suggestions from the response
    if (preg_match_all('/(?:recommend|suggest|consider|try)(?:ed|ing)?\s+([^.!?]+)/i', $text, $matches)) {
        foreach ($matches[1] as $match) {
            $suggestion = trim($match);
            if (strlen($suggestion) > 10 && strlen($suggestion) < 100) {
                $suggestions[] = $suggestion;
            }
        }
    }
    
    // Limit to 3 most relevant suggestions
    return array_slice($suggestions, 0, 3);
}

function estimateTokenCount($text) {
    // Rough estimation: 1 token ≈ 4 characters for English text
    return ceil(strlen($text) / 4);
}

// ===== CACHING SYSTEM =====
function getCachedResponse($prompt, $context) {
    $cacheKey = 'hs_cache_' . md5($prompt . serialize($context));
    $cacheFile = sys_get_temp_dir() . '/' . $cacheKey;
    
    if (file_exists($cacheFile)) {
        $cacheData = json_decode(file_get_contents($cacheFile), true);
        
        // Cache valid for 1 hour
        if ($cacheData && time() - $cacheData['timestamp'] < 3600) {
            return $cacheData['response'];
        }
    }
    
    return null;
}

function setCachedResponse($prompt, $context, $response) {
    $cacheKey = 'hs_cache_' . md5($prompt . serialize($context));
    $cacheFile = sys_get_temp_dir() . '/' . $cacheKey;
    
    $cacheData = [
        'timestamp' => time(),
        'response' => $response
    ];
    
    file_put_contents($cacheFile, json_encode($cacheData), LOCK_EX);
}

// ===== LOGGING SYSTEM =====
function logRequest($prompt, $response, $processingTime) {
    global $config;
    
    if (!$config['debug_mode']) {
        return;
    }
    
    $logEntry = [
        'timestamp' => date('c'),
        'ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown',
        'prompt_length' => strlen($prompt),
        'response_type' => $response['response']['type'] ?? 'unknown',
        'processing_time' => $processingTime,
        'success' => isset($response['success'])
    ];
    
    $logFile = sys_get_temp_dir() . '/horizonsync_ai.log';
    file_put_contents($logFile, json_encode($logEntry) . "\n", FILE_APPEND | LOCK_EX);
}

// ===== ERROR HANDLING =====
function sendErrorResponse($error) {
    http_response_code($error['code']);
    
    if (isset($error['retry_after'])) {
        header("Retry-After: {$error['retry_after']}");
    }
    
    echo json_encode([
        'success' => false,
        'error' => [
            'message' => $error['error'],
            'code' => $error['code'],
            'timestamp' => date('c')
        ]
    ]);
    exit;
}

function sendSuccessResponse($response) {
    http_response_code(200);
    echo json_encode($response);
    exit;
}

// ===== FALLBACK RESPONSES =====
function generateFallbackResponse($prompt, $context) {
    $responseType = 'general_advice';
    $suggestions = [];
    
    // Analyze prompt keywords for better fallback
    $lowerPrompt = strtolower($prompt);
    
    if (strpos($lowerPrompt, 'coverage') !== false || strpos($lowerPrompt, '24') !== false) {
        $responseType = 'coverage_analysis';
        $text = "To achieve better coverage, consider adding team members in complementary time zones. " .
                "Focus on locations that fill current gaps in your 24-hour cycle. " .
                "Europe/London and America/New_York are often strategic choices for global teams.";
        $suggestions = [
            "Add team members in Europe for better coverage",
            "Consider Americas timezone for complete global reach",
            "Analyze current coverage gaps for strategic hiring"
        ];
    } elseif (strpos($lowerPrompt, 'hire') !== false || strpos($lowerPrompt, 'location') !== false) {
        $responseType = 'hiring_recommendation';
        $text = "When expanding your team, prioritize locations that complement your existing coverage. " .
                "Look for timezones that create natural handoff points and minimize coverage gaps. " .
                "Consider factors like talent availability, cost, and cultural alignment.";
        $suggestions = [
            "Evaluate timezone overlap for smooth handoffs",
            "Research talent pools in target locations",
            "Plan gradual expansion for better integration"
        ];
    } elseif (strpos($lowerPrompt, 'handoff') !== false || strpos($lowerPrompt, 'optimize') !== false) {
        $responseType = 'handoff_optimization';
        $text = "Optimize team handoffs by creating overlap periods between shifts. " .
                "Implement clear documentation standards and establish routine handoff meetings. " .
                "Use asynchronous communication tools to bridge timezone gaps effectively.";
        $suggestions = [
            "Establish 1-2 hour overlap windows between teams",
            "Create standardized handoff documentation",
            "Use async tools for seamless communication"
        ];
    } else {
        $text = "For effective global team coordination, focus on three key areas: " .
                "coverage optimization, strategic hiring, and smooth handoff processes. " .
                "Each location should complement your existing team structure.";
        $suggestions = [
            "How can I achieve 24-hour coverage?",
            "Where should I hire my next team member?",
            "Optimize our current workflow handoffs"
        ];
    }
    
    return [
        'success' => true,
        'response' => [
            'text' => $text,
            'type' => $responseType,
            'suggestions' => $suggestions,
            'metadata' => [
                'timestamp' => date('c'),
                'model' => 'fallback',
                'tokens' => estimateTokenCount($text)
            ]
        ],
        'fallback' => true
    ];
}

// ===== MAIN EXECUTION =====
try {
    $startTime = microtime(true);
    
    // Handle preflight CORS requests
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(200);
        exit;
    }
    
    // Validate request
    $validationError = validateRequest();
    if ($validationError) {
        sendErrorResponse($validationError);
    }
    
    // Check rate limiting
    $rateLimitError = checkRateLimit();
    if ($rateLimitError) {
        sendErrorResponse($rateLimitError);
    }
    
    // Get and validate input
    $inputData = json_decode(file_get_contents('php://input'), true);
    if (!$inputData) {
        sendErrorResponse(['error' => 'Invalid JSON input', 'code' => 400]);
    }
    
    $inputError = validateInput($inputData);
    if ($inputError) {
        sendErrorResponse($inputError);
    }
    
    $userPrompt = trim($inputData['prompt']);
    $context = $inputData['context'] ?? [];
    
    // Check cache first
    $cachedResponse = getCachedResponse($userPrompt, $context);
    if ($cachedResponse) {
        $cachedResponse['cached'] = true;
        sendSuccessResponse($cachedResponse);
    }
    
    // Build optimized prompt
    $optimizedPrompt = buildOptimizedPrompt($userPrompt, $context);
    
    // Call AI API
    $apiResponse = callGeminiAPI($optimizedPrompt);
    
    // Handle API errors with fallback
    if (isset($apiResponse['error'])) {
        $fallbackResponse = generateFallbackResponse($userPrompt, $context);
        $fallbackResponse['api_error'] = $apiResponse['error'];
        
        // Cache fallback response briefly
        setCachedResponse($userPrompt, $context, $fallbackResponse);
        
        sendSuccessResponse($fallbackResponse);
    }
    
    // Process successful response
    $processedResponse = processAIResponse($apiResponse);
    
    if (isset($processedResponse['error'])) {
        $fallbackResponse = generateFallbackResponse($userPrompt, $context);
        sendSuccessResponse($fallbackResponse);
    }
    
    // Cache successful response
    setCachedResponse($userPrompt, $context, $processedResponse);
    
    // Log request (if debug mode)
    $processingTime = microtime(true) - $startTime;
    logRequest($userPrompt, $processedResponse, $processingTime);
    
    // Send successful response
    sendSuccessResponse($processedResponse);
    
} catch (Throwable $e) {
    // Log critical errors
    error_log("HorizonSync AI Proxy Critical Error: " . $e->getMessage() . " in " . $e->getFile() . " on line " . $e->getLine());
    
    // Send generic error response
    sendErrorResponse([
        'error' => 'Internal server error occurred',
        'code' => 500
    ]);
}

// ===== CLEANUP FUNCTIONS =====
// Clean old cache files (call this periodically via cron)
function cleanupCache() {
    $tempDir = sys_get_temp_dir();
    $pattern = $tempDir . '/hs_cache_*';
    $cacheFiles = glob($pattern);
    $now = time();
    
    foreach ($cacheFiles as $file) {
        if (file_exists($file) && $now - filemtime($file) > 86400) { // 24 hours
            unlink($file);
        }
    }
}

// Clean old rate limit files
function cleanupRateLimits() {
    $tempDir = sys_get_temp_dir();
    $patterns = [
        $tempDir . '/hs_rate_h_*',
        $tempDir . '/hs_rate_d_*'
    ];
    
    $now = time();
    
    foreach ($patterns as $pattern) {
        $files = glob($pattern);
        foreach ($files as $file) {
            if (file_exists($file)) {
                $data = json_decode(file_get_contents($file), true);
                if ($data && $now > $data['expiry']) {
                    unlink($file);
                }
            }
        }
    }
}

// Rotate log files
function rotateLogs() {
    $logFile = sys_get_temp_dir() . '/horizonsync_ai.log';
    
    if (file_exists($logFile) && filesize($logFile) > 10 * 1024 * 1024) { // 10MB
        $rotatedFile = $logFile . '.' . date('Y-m-d-H-i-s');
        rename($logFile, $rotatedFile);
        
        // Keep only last 5 rotated logs
        $rotatedLogs = glob($logFile . '.*');
        if (count($rotatedLogs) > 5) {
            array_multisort(array_map('filemtime', $rotatedLogs), SORT_ASC, $rotatedLogs);
            foreach (array_slice($rotatedLogs, 0, -5) as $oldLog) {
                unlink($oldLog);
            }
        }
    }
}

// ===== API HEALTH CHECK =====
function healthCheck() {
    global $config;
    
    $health = [
        'status' => 'healthy',
        'timestamp' => date('c'),
        'checks' => []
    ];
    
    // Check API key
    $health['checks']['api_key'] = !empty($config['api_key']) ? 'ok' : 'missing';
    
    // Check write permissions
    $tempFile = sys_get_temp_dir() . '/hs_write_test';
    $health['checks']['write_permissions'] = file_put_contents($tempFile, 'test') !== false ? 'ok' : 'failed';
    if (file_exists($tempFile)) unlink($tempFile);
    
    // Check disk space
    $freeSpace = disk_free_space(sys_get_temp_dir());
    $health['checks']['disk_space'] = $freeSpace > 100 * 1024 * 1024 ? 'ok' : 'low'; // 100MB threshold
    
    // Overall status
    $failed = array_filter($health['checks'], function($status) {
        return $status !== 'ok';
    });
    
    if (!empty($failed)) {
        $health['status'] = 'degraded';
        http_response_code(503);
    }
    
    return $health;
}

// Handle health check requests
if (isset($_GET['health'])) {
    header('Content-Type: application/json');
    echo json_encode(healthCheck());
    exit;
}

// Handle cleanup requests (for maintenance)
if (isset($_GET['cleanup']) && $_GET['cleanup'] === 'true') {
    cleanupCache();
    cleanupRateLimits();
    rotateLogs();
    
    echo json_encode([
        'success' => true,
        'message' => 'Cleanup completed',
        'timestamp' => date('c')
    ]);
    exit;
}

?>