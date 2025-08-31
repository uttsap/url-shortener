#!/bin/bash

echo "=========================================="
echo "URL Shortener & Analytics Load Testing"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test URLs
ALIAS1="fxTw"
ALIAS2="21sO0"
ALIAS3="fxTx"

echo -e "${BLUE}Starting Load Tests...${NC}"
echo ""

# Function to run wrk test
run_wrk_test() {
    local name="$1"
    local url="$2"
    local duration="$3"
    local connections="$4"
    local threads="$5"
    
    echo -e "${YELLOW}Testing: $name${NC}"
    echo "URL: $url"
    echo "Duration: ${duration}s, Connections: $connections, Threads: $threads"
    echo "----------------------------------------"
    
    wrk -t$threads -c$connections -d${duration}s --latency "$url" 2>&1
    echo ""
}

# Function to run Apache Bench test
run_ab_test() {
    local name="$1"
    local url="$2"
    local requests="$3"
    local concurrency="$4"
    
    echo -e "${YELLOW}Testing: $name${NC}"
    echo "URL: $url"
    echo "Requests: $requests, Concurrency: $concurrency"
    echo "----------------------------------------"
    
    ab -n $requests -c $concurrency "$url" 2>&1 | grep -E "(Requests per second|Time per request|Failed requests|Complete requests)"
    echo ""
}

echo -e "${GREEN}=== URL Shortener Service Tests ===${NC}"
echo ""

# Test 1: URL Shortener - Health Check (Light Load)
run_wrk_test "URL Shortener Health Check" "http://localhost:3000/" 10 10 2

# Test 2: URL Shortener - Redirect (Medium Load)
run_wrk_test "URL Shortener - Redirect (fxTw)" "http://localhost:3000/$ALIAS1" 15 30 4

# Test 3: URL Shortener - Redirect (21sO0)
run_wrk_test "URL Shortener - Redirect (21sO0)" "http://localhost:3000/$ALIAS2" 15 30 4

# Test 4: URL Shortener - Redirect (fxTx)
run_wrk_test "URL Shortener - Redirect (fxTx)" "http://localhost:3000/$ALIAS3" 15 30 4

echo -e "${GREEN}=== Analytics Service Tests ===${NC}"
echo ""

# Test 5: Analytics - Health Check
run_wrk_test "Analytics Health Check" "http://localhost:3001/analytics/health" 10 10 2

# Test 6: Analytics - Get Clicks
run_wrk_test "Analytics - Get Clicks" "http://localhost:3001/analytics/clicks?alias=$ALIAS1" 15 20 4

# Test 7: Analytics - Get Stats
run_wrk_test "Analytics - Get Stats" "http://localhost:3001/analytics/stats?alias=$ALIAS1" 15 20 4

echo -e "${GREEN}=== Apache Bench Tests ===${NC}"
echo ""

# Apache Bench tests for comparison
run_ab_test "URL Shortener - Health Check (AB)" "http://localhost:3000/" 1000 10
run_ab_test "URL Shortener - Redirect (AB)" "http://localhost:3000/$ALIAS1" 1000 20
run_ab_test "Analytics - Health Check (AB)" "http://localhost:3001/analytics/health" 1000 10
run_ab_test "Analytics - Get Clicks (AB)" "http://localhost:3001/analytics/clicks?alias=$ALIAS1" 500 10

echo -e "${GREEN}=== Stress Tests ===${NC}"
echo ""

# Stress test with high concurrency
echo -e "${YELLOW}Stress Test: High Concurrency Redirect${NC}"
echo "URL: http://localhost:3000/$ALIAS1"
echo "Duration: 30s, Connections: 100, Threads: 8"
echo "----------------------------------------"
wrk -t8 -c100 -d30s --latency "http://localhost:3000/$ALIAS1" 2>&1
echo ""

# Stress test for analytics
echo -e "${YELLOW}Stress Test: High Concurrency Analytics${NC}"
echo "URL: http://localhost:3001/analytics/clicks?alias=$ALIAS1"
echo "Duration: 20s, Connections: 50, Threads: 4"
echo "----------------------------------------"
wrk -t4 -c50 -d20s --latency "http://localhost:3001/analytics/clicks?alias=$ALIAS1" 2>&1
echo ""

echo -e "${GREEN}=== Load Test Complete ===${NC}"
echo ""
echo -e "${BLUE}Summary:${NC}"
echo "- URL Shortener Service: http://localhost:3000"
echo "- Analytics Service: http://localhost:3001"
echo "- Test Aliases: $ALIAS1, $ALIAS2, $ALIAS3"
echo ""
echo "Check the results above for performance metrics including:"
echo "- Requests per second"
echo "- Latency percentiles"
echo "- Error rates"
echo "- Throughput" 