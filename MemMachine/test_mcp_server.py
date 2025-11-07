#!/usr/bin/env python3
"""Test script for MemMachine MCP Server"""

import requests
import json
import time

MCP_URL = "http://localhost:8080/mcp/"
headers = {
    "Content-Type": "application/json",
    "Accept": "application/json, text/event-stream",  # Required for SSE
    "user-id": "test-user"
}

print("=" * 60)
print("MemMachine MCP Server Test")
print("=" * 60)
print()

# Step 1: Get session ID
print("Step 1: Getting session ID...")
try:
    # Must use Accept: text/event-stream to get session ID
    response = requests.get(
        MCP_URL, 
        headers={"Accept": "text/event-stream"}, 
        stream=True, 
        timeout=5
    )
    session_id = response.headers.get("mcp-session-id")
    if session_id:
        print(f"✅ Session ID obtained: {session_id[:20]}...")
        headers["mcp-session-id"] = session_id
    else:
        print("❌ Failed to get session ID")
        print(f"   Response status: {response.status_code}")
        print(f"   Response headers: {dict(response.headers)}")
        exit(1)
except Exception as e:
    print(f"❌ Error getting session ID: {e}")
    exit(1)

# Step 2: Initialize
print("\nStep 2: Initializing MCP session...")
init_payload = {
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
        "protocolVersion": "2024-11-05",
        "capabilities": {},
        "clientInfo": {
            "name": "test-client",
            "version": "1.0.0"
        }
    }
}

try:
    response = requests.post(
        MCP_URL, 
        headers=headers,  # Includes Accept: text/event-stream
        json=init_payload, 
        timeout=10, 
        stream=True
    )
    if response.status_code == 200:
        # Parse SSE format
        found_result = False
        for line in response.iter_lines():
            if line:
                line_str = line.decode('utf-8')
                if line_str.startswith('event: message'):
                    continue
                elif line_str.startswith('data:'):
                    try:
                        data = json.loads(line_str[5:].strip())
                        if "result" in data:
                            server_info = data["result"].get("serverInfo", {})
                            print(f"✅ Session initialized successfully")
                            print(f"   Server: {server_info.get('name')} v{server_info.get('version')}")
                            found_result = True
                            break
                    except json.JSONDecodeError:
                        continue
        if not found_result:
            print("⚠️  No result found in SSE stream")
    else:
        print(f"❌ Initialize failed: {response.status_code}")
        print(f"   Response: {response.text[:200]}")
        print(f"   Headers: {dict(response.headers)}")
except Exception as e:
    print(f"❌ Error initializing: {e}")
    import traceback
    traceback.print_exc()

time.sleep(1)

# Step 3: Send initialized notification
print("\nStep 3: Sending initialized notification...")
try:
    response = requests.post(MCP_URL, headers=headers, json={
        "jsonrpc": "2.0",
        "method": "notifications/initialized"
    }, timeout=10)
    if response.status_code == 200:
        print("✅ Initialized notification sent")
    else:
        print(f"⚠️  Unexpected status: {response.status_code}")
except Exception as e:
    print(f"⚠️  Error sending notification: {e}")

time.sleep(1)

# Step 4: List tools
print("\nStep 4: Listing available tools...")
list_tools_payload = {
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/list",
    "params": {}
}

try:
    response = requests.post(
        MCP_URL, 
        headers=headers,  # Includes Accept: text/event-stream
        json=list_tools_payload, 
        timeout=10, 
        stream=True
    )
    if response.status_code == 200:
        # Parse SSE format
        found_result = False
        for line in response.iter_lines():
            if line:
                line_str = line.decode('utf-8')
                if line_str.startswith('event: message'):
                    continue
                elif line_str.startswith('data:'):
                    try:
                        result = json.loads(line_str[5:].strip())
                        if "result" in result and "tools" in result["result"]:
                            tools = result["result"]["tools"]
                            print(f"✅ Found {len(tools)} tool(s):")
                            for tool in tools:
                                print(f"   - {tool['name']}: {tool['description'][:60]}...")
                            found_result = True
                            break
                        else:
                            print("❌ Unexpected response format")
                            print(f"   Response: {json.dumps(result, indent=2)[:300]}")
                            break
                    except json.JSONDecodeError:
                        continue
        if not found_result:
            print("⚠️  No tools found in SSE stream")
    else:
        print(f"❌ List tools failed: {response.status_code}")
        print(f"   Response: {response.text[:200]}")
        print(f"   Headers: {dict(response.headers)}")
except Exception as e:
    print(f"❌ Error listing tools: {e}")
    import traceback
    traceback.print_exc()

time.sleep(1)

# Step 5: Test add_memory
print("\nStep 5: Testing add_memory tool...")
add_memory_payload = {
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
        "name": "add_memory",
        "arguments": {
            "param": {
                "user_id": "test-user",
                "content": "Testing MCP server with AWS Bedrock and Claude Haiku 4.5. I am a software engineer who loves Python and machine learning."
            }
        }
    }
}

try:
    response = requests.post(
        MCP_URL, 
        headers=headers,  # Includes Accept: text/event-stream
        json=add_memory_payload, 
        timeout=30, 
        stream=True
    )
    if response.status_code == 200:
        # Parse SSE format
        found_result = False
        for line in response.iter_lines():
            if line:
                line_str = line.decode('utf-8')
                if line_str.startswith('event: message'):
                    continue
                elif line_str.startswith('data:'):
                    try:
                        result = json.loads(line_str[5:].strip())
                        if "result" in result:
                            tool_result = result["result"]
                            # Handle different response formats
                            if isinstance(tool_result, list) and len(tool_result) > 0:
                                # Format: [{"type": "text", "text": "{\"status\":200,...}"}]
                                text_content = tool_result[0].get("text", "")
                                if text_content:
                                    parsed = json.loads(text_content)
                                    if isinstance(parsed, dict) and "status" in parsed:
                                        if parsed["status"] == 200:
                                            print("✅ Memory added successfully!")
                                            print(f"   Status: {parsed['status']}, Message: {parsed.get('message', 'N/A')}")
                                        else:
                                            print(f"⚠️  Memory add returned status: {parsed['status']}")
                                            print(f"   Message: {parsed.get('message', 'N/A')}")
                                    else:
                                        print(f"✅ Response: {json.dumps(parsed, indent=2)[:200]}")
                            elif "content" in tool_result:
                                content = tool_result["content"]
                                if isinstance(content, dict) and "status" in content:
                                    if content["status"] == 200:
                                        print("✅ Memory added successfully!")
                                        print(f"   Status: {content['status']}, Message: {content.get('message', 'N/A')}")
                                    else:
                                        print(f"⚠️  Memory add returned status: {content['status']}")
                                        print(f"   Message: {content.get('message', 'N/A')}")
                                else:
                                    print(f"✅ Response: {json.dumps(content, indent=2)[:200]}")
                            else:
                                print(f"✅ Response: {json.dumps(tool_result, indent=2)[:200]}")
                            found_result = True
                            break
                        elif "error" in result:
                            print(f"❌ Error in response: {result['error']}")
                            break
                    except json.JSONDecodeError as e:
                        print(f"⚠️  JSON decode error: {e}, line: {line_str[:100]}")
                        continue
        if not found_result:
            print("⚠️  No result found in SSE stream")
    else:
        print(f"❌ Add memory failed: {response.status_code}")
        print(f"   Response: {response.text[:200]}")
        print(f"   Headers: {dict(response.headers)}")
except Exception as e:
    print(f"❌ Error adding memory: {e}")
    import traceback
    traceback.print_exc()

time.sleep(3)

# Step 6: Test search_memory
print("\nStep 6: Testing search_memory tool...")
search_memory_payload = {
    "jsonrpc": "2.0",
    "id": 4,
    "method": "tools/call",
    "params": {
        "name": "search_memory",
        "arguments": {
            "param": {
                "user_id": "test-user",
                "query": "machine learning",
                "limit": 3
            }
        }
    }
}

try:
    response = requests.post(
        MCP_URL, 
        headers=headers,  # Includes Accept: text/event-stream
        json=search_memory_payload, 
        timeout=30, 
        stream=True
    )
    if response.status_code == 200:
        # Parse SSE format
        found_result = False
        for line in response.iter_lines():
            if line:
                line_str = line.decode('utf-8')
                if line_str.startswith('event: message'):
                    continue
                elif line_str.startswith('data:'):
                    try:
                        result = json.loads(line_str[5:].strip())
                        if "result" in result:
                            tool_result = result["result"]
                            # Handle different response formats
                            if isinstance(tool_result, list) and len(tool_result) > 0:
                                # Format: [{"type": "text", "text": "{\"status\":0,...}"}]
                                text_content = tool_result[0].get("text", "")
                                if text_content:
                                    parsed = json.loads(text_content)
                                    if isinstance(parsed, dict) and "content" in parsed:
                                        content = parsed["content"]
                                        print("✅ Memory search successful!")
                                        if "episodic_memory" in content:
                                            episodes = content["episodic_memory"]
                                            if isinstance(episodes, list) and len(episodes) > 1:
                                                memory_items = episodes[1] if len(episodes) > 1 else []
                                                print(f"   Found {len(memory_items)} memory item(s)")
                                                for i, item in enumerate(memory_items[:3], 1):
                                                    if isinstance(item, dict) and "content" in item:
                                                        print(f"   {i}. {item['content'][:60]}...")
                                        if "profile_memory" in content:
                                            profile = content["profile_memory"]
                                            if profile:
                                                print(f"   Profile memory: {len(profile)} item(s)")
                                    else:
                                        print(f"✅ Response: {json.dumps(parsed, indent=2)[:300]}")
                            elif "content" in tool_result:
                                content = tool_result["content"]
                                if isinstance(content, dict):
                                    print("✅ Memory search successful!")
                                    if "episodic_memory" in content:
                                        episodes = content["episodic_memory"]
                                        if isinstance(episodes, list) and len(episodes) > 1:
                                            memory_items = episodes[1] if len(episodes) > 1 else []
                                            print(f"   Found {len(memory_items)} memory item(s)")
                                            for i, item in enumerate(memory_items[:3], 1):
                                                if isinstance(item, dict) and "content" in item:
                                                    print(f"   {i}. {item['content'][:60]}...")
                                    if "profile_memory" in content:
                                        profile = content["profile_memory"]
                                        if profile:
                                            print(f"   Profile memory: {len(profile)} item(s)")
                                else:
                                    print(f"✅ Response: {json.dumps(content, indent=2)[:300]}")
                            else:
                                print(f"✅ Response: {json.dumps(tool_result, indent=2)[:200]}")
                            found_result = True
                            break
                        elif "error" in result:
                            print(f"❌ Error in response: {result['error']}")
                            break
                    except json.JSONDecodeError as e:
                        print(f"⚠️  JSON decode error: {e}, line: {line_str[:100]}")
                        continue
        if not found_result:
            print("⚠️  No result found in SSE stream")
    else:
        print(f"❌ Search memory failed: {response.status_code}")
        print(f"   Response: {response.text[:200]}")
        print(f"   Headers: {dict(response.headers)}")
except Exception as e:
    print(f"❌ Error searching memory: {e}")
    import traceback
    traceback.print_exc()

print("\n" + "=" * 60)
print("MCP Server Test Complete")
print("=" * 60)

