# 🤖 AI-Powered Event Crawling & Filtering Guide

Complete guide for setting up and using AI-powered event scraping, filtering, and categorization on a 2GB RAM VPS.

---

## 📋 Overview

This system automatically:

- ✅ Scrapes events from Meetup, Luma, and other sources
- ✅ Filters out spam, MLM, and low-quality events using AI
- ✅ Categorizes events intelligently
- ✅ Runs on lightweight hardware (2GB RAM VPS)

**Model:** Qwen2.5 0.5B (500M parameters)  
**RAM Usage:** ~400MB  
**Speed:** Very fast on limited hardware  
**Korean Support:** ✅ Excellent

---

## 🚀 Quick Start (5 Minutes)

### Step 1: Install Ollama

```bash
# SSH into your VPS
ssh your-vps

# Install Ollama (one-line install)
curl -fsSL https://ollama.com/install.sh | sh
```

### Step 2: Pull the Tiny Model

```bash
# Pull Qwen2.5 0.5B (only ~300MB download)
ollama pull qwen2.5:0.5b

# Verify it's installed
ollama list
```

**Expected output:**

```
NAME                 ID              SIZE      MODIFIED
qwen2.5:0.5b         abc123def       300 MB    2 seconds ago
```

### Step 3: Start Ollama Service

```bash
# Start Ollama server (runs on port 11434)
ollama serve

# Or run in background with systemd (recommended)
sudo systemctl enable ollama
sudo systemctl start ollama
sudo systemctl status ollama
```

### Step 4: Configure Environment Variables

Add to your `.env` file:

```bash
# Enable AI filtering
LLM_ENABLED=true

# Ollama configuration
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:0.5b
```

### Step 5: Restart Your NestJS App

```bash
# If using PM2
pm2 restart all

# Or if running directly
npm run start:prod
```

### Step 6: Test It!

```bash
# Trigger event scraping (will use AI filtering)
curl http://localhost:3011/web-crawling/events

# Check the output
cat jsons/all_events.json | grep "acceptanceRate"
```

**Expected:** See acceptance rate (e.g., "81.7%")

---

## 📊 What the AI Does

### 1. Quality Filtering

**Accepts:**

- ✅ Legitimate community events
- ✅ Professional networking events
- ✅ Educational workshops
- ✅ Tech talks & conferences
- ✅ Language exchanges
- ✅ Social gatherings
- ✅ Promotional events (product launches, demos)
- ✅ Sports & fitness events
- ✅ Entertainment events
- ✅ Community events (volunteer, charity)

**Rejects:**

- ❌ Clear spam (gibberish, "test event", no content)
- ❌ MLM/pyramid schemes
- ❌ Scams or illegal activities
- ❌ Broken events (no name, no date, completely empty)
- ❌ Extremely inappropriate content

**Expected Acceptance Rate:** 70-85% (was 1.8% before update)

### 2. Smart Categorization

The AI automatically assigns categories to events:

```
"Seoul AI Meetup" → ["TECHNOLOGY", "SOCIAL"]
"Korean Language Exchange" → ["EDUCATION", "SOCIAL"]
"Startup Networking Night" → ["BUSINESS", "SOCIAL"]
"Yoga Class" → ["SPORTS", "HEALTH"]
"Movie Night" → ["ENTERTAINMENT", "SOCIAL"]
```

---

## 🧪 How It Works

### Workflow

```
1. Scraping
   Meetup + Luma → 300 events scraped

2. AI Filtering
   LLM checks each event:
   ✅ Accept: High quality, relevant, clear description
   ❌ Reject: Spam, MLM, low quality, no description

3. AI Categorization
   LLM assigns categories to accepted events

4. Save Results
   jsons/all_events.json:
   {
     "metadata": {
       "totalScraped": 300,
       "totalAccepted": 245,
       "totalRejected": 55,
       "acceptanceRate": "81.7%"
     },
     "acceptedEvents": [...],
     "rejectedEvents": [...]
   }
```

---

## 💾 Resource Usage

### RAM Usage Comparison

| Component       | RAM         | Status              |
| --------------- | ----------- | ------------------- |
| NestJS API      | 150 MB      | Running             |
| MongoDB         | 100 MB      | Running             |
| **Ollama (AI)** | **400 MB**  | **✅ New!**         |
| Other           | 100 MB      | -                   |
| **Total**       | **~750 MB** | **✅ 1.25 GB free** |

**Your 2GB VPS is more than enough!** 🎉

### Performance Expectations

| Task                               | Time             | RAM Usage       |
| ---------------------------------- | ---------------- | --------------- |
| **Scraping** (300 events)          | ~30 seconds      | ~300MB          |
| **AI Filtering** (300 events)      | ~2-3 minutes     | ~400MB          |
| **AI Categorization** (250 events) | ~1-2 minutes     | ~400MB          |
| **Total**                          | **~4-6 minutes** | **~700MB peak** |

---

## ⚙️ Configuration & Tuning

### Enable/Disable AI

```bash
# In .env
LLM_ENABLED=true   # Enable AI
LLM_ENABLED=false  # Disable AI (accept all events)
```

### Adjust AI Strictness

Edit `apps/batch/src/components/llm/llm.service.ts`:

**Make MORE lenient (accept more):**

```typescript
// Line ~117
temperature: 0.1,  // Lower = more consistent acceptance
```

**Make MORE strict (reject more):**

```typescript
// Line ~117
temperature: 0.3,  // Higher = more nuanced decisions
```

**Default:** `temperature: 0.2` (balanced)

### Use Different Model

If you need even smaller RAM usage:

```bash
# Pull TinyLlama (also good, ~500MB RAM)
ollama pull tinyllama

# Update .env
OLLAMA_MODEL=tinyllama

# Restart
pm2 restart all
```

### Model Comparison

| Model               | Parameters | RAM Usage  | Korean Support   | Speed            |
| ------------------- | ---------- | ---------- | ---------------- | ---------------- |
| **Qwen2.5 0.5B** ⭐ | **500M**   | **~400MB** | **✅ Excellent** | **⚡ Very Fast** |
| TinyLlama 1.1B      | 1.1B       | ~700MB     | ⚠️ Limited       | ⚡ Fast          |
| Llama 3.2 1B        | 1B         | ~600MB     | ⚠️ Limited       | Fast             |
| Phi-3 Mini          | 3.8B       | ~2.5GB     | ❌ Won't fit     | Slow             |

**Verdict:** Qwen2.5 0.5B is perfect for 2GB RAM + Korean processing!

---

## 🐛 Troubleshooting

### ❌ "Connection refused to localhost:11434"

**Problem:** Ollama is not running

**Solution:**

```bash
# Check if running
ps aux | grep ollama

# Start it
ollama serve

# Or use systemd
sudo systemctl start ollama
```

### ❌ "Model not found"

**Problem:** Model not downloaded

**Solution:**

```bash
# Pull the model
ollama pull qwen2.5:0.5b

# Check it's there
ollama list
```

### ❌ "Out of memory" errors

**Problem:** Model too large for your RAM

**Solution 1: Use smaller model**

```bash
# Try the absolute smallest (TinyLlama)
ollama pull tinyllama
OLLAMA_MODEL=tinyllama
```

**Solution 2: Disable LLM temporarily**

```bash
LLM_ENABLED=false
pm2 restart all
```

### ❌ Events still being scraped but not filtered

**Problem:** LLM_ENABLED is false

**Solution:**

```bash
# Check .env
cat .env | grep LLM_ENABLED

# Should be:
LLM_ENABLED=true

# Restart
pm2 restart all
```

### ❌ Ollama is slow

**Problem:** CPU limited

**Solution:**

```bash
# Check CPU usage
htop

# Reduce concurrent processing in llm.service.ts
# Process events one-by-one instead of batch
```

---

## 📈 Monitoring

### Check LLM Status

```bash
# View logs
pm2 logs

# Look for:
# "🤖 LLM enabled: qwen2.5:0.5b"
# "✅ Filtered: 245 accepted, 55 rejected"
```

### Check RAM Usage

```bash
# Overall system RAM
free -h

# Ollama process
ps aux | grep ollama

# Expected: ~400MB for Ollama
```

### Check Filtering Results

```bash
# View acceptance rate
cat jsons/all_events.json | grep "acceptanceRate"

# View sample rejections
cat jsons/all_events.json | jq '.rejectedEvents[0:5]'
```

### Success Indicators

When everything works, you'll see in logs:

```
🤖 LLM enabled: qwen2.5:0.5b at http://localhost:11434
💾 Estimated RAM usage: ~400MB
🔄 Starting web scraping from all sources...
📊 Total scraped: 306 events
🔍 Filtering 306 events with AI...
✅ Filtered: 245 accepted, 61 rejected
🏷️  Categorizing 245 events with AI...
✅ Categorization complete
💾 Saved to jsons/all_events.json:
   ✅ 245 accepted events
   ❌ 61 rejected events
✅ Final: 245 events ready
```

And in JSON:

```json
{
	"metadata": {
		"acceptanceRate": "80.0%",
		"llm": {
			"enabled": true,
			"model": "qwen2.5:0.5b"
		}
	}
}
```

---

## 🔄 Automation

### Run Scraping + AI Filtering Daily

Add to crontab:

```bash
# Edit crontab
crontab -e

# Add daily scraping at midnight
0 0 * * * curl http://localhost:3011/web-crawling/events >> /var/log/event-scraping.log 2>&1
```

**Result:** Fresh AI-filtered events every day automatically!

---

## 🔒 Security

### Ollama Access

By default, Ollama runs on `localhost:11434` (not exposed to internet). This is secure.

If you need remote access:

```bash
# Edit Ollama config
sudo vim /etc/systemd/system/ollama.service

# Add OLLAMA_HOST
Environment="OLLAMA_HOST=0.0.0.0:11434"

# Restart
sudo systemctl daemon-reload
sudo systemctl restart ollama

# ⚠️ WARNING: This exposes Ollama to the internet!
# Use firewall or reverse proxy with auth
```

---

## 📁 Files & Structure

### Core AI Service

- `apps/batch/src/components/llm/llm.service.ts` - Lightweight LLM service
- `apps/batch/src/components/llm/llm.module.ts` - NestJS module

### Integration

- `apps/batch/src/components/webCrawling/webCrawling.service.ts` - Integrated AI filtering
- `apps/batch/src/components/webCrawling/webCrawling.module.ts` - Added LLM module

### Configuration

- `apps/batch/src/libs/constants/llm.constants.ts` - LLM configuration constants
- `.env` - Environment variables

---

## 🎯 Expected Results

### Before AI:

```json
{
	"totalScraped": 300,
	"allEvents": [
		/* all 300 events, including spam */
	]
}
```

### After AI:

```json
{
	"metadata": {
		"totalScraped": 300,
		"totalAccepted": 245,
		"totalRejected": 55,
		"acceptanceRate": "81.7%"
	},
	"acceptedEvents": [
		/* 245 high-quality events */
	],
	"rejectedEvents": [
		{
			"eventName": "Buy My Course!",
			"reason": "Promotional spam"
		}
	]
}
```

---

## 💡 Pro Tips

1. **Start with LLM_ENABLED=false** to test scraping first
2. **Enable AI** once scraping works reliably
3. **Monitor RAM** with `htop` or `free -h`
4. **Check rejected events** to tune filtering strictness
5. **Adjust temperature** for strictness (0.1 = lenient, 0.3 = strict)
6. **Use systemd** for Ollama to auto-start on boot

---

## 🆘 Still Having Issues?

### Common Fixes

1. **Restart everything:**

   ```bash
   sudo systemctl restart ollama
   pm2 restart all
   ```

2. **Check disk space:**

   ```bash
   df -h
   # Need ~1GB free for model
   ```

3. **Check Ollama logs:**

   ```bash
   sudo journalctl -u ollama -f
   ```

4. **Try the test endpoint:**
   ```bash
   curl http://localhost:11434/api/tags
   ```

---

## ✅ Success Checklist

- [ ] Ollama installed
- [ ] Qwen2.5 0.5B model pulled
- [ ] Ollama service running
- [ ] `.env` configured with `LLM_ENABLED=true`
- [ ] NestJS app restarted
- [ ] Test scraping successful
- [ ] `jsons/all_events.json` shows acceptance rate
- [ ] RAM usage under 1GB ✅

---

## 📞 Summary

**You now have:**

- ✅ Lightweight AI (<1B params)
- ✅ Running on 2GB RAM VPS
- ✅ Korean language support
- ✅ Automatic event filtering (70-85% acceptance rate)
- ✅ Smart categorization
- ✅ Zero ongoing costs
- ✅ Fully automated

**Total setup time:** ~5 minutes  
**Total cost:** $0 extra  
**VPS Requirements:** 2GB RAM ✅

**Enjoy your AI-powered event platform! 🚀🤖**
