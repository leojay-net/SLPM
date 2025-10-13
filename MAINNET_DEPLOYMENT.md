# Privacy Mixer Contract - Mainnet Deployment Information

## 🚀 **Deployment Details**

### **Network:** Starknet Mainnet
### **Deployment Date:** October 11, 2025

---

## 📋 **Contract Information**

| Property | Value |
|----------|--------|
| **Contract Address** | `0x05effdcfda86066c72c108e174c55a4f8d1249ba69f80e975d7fc814199a376b` |
| **Transaction Hash** | `0x0690607f0914a9b03803487fcbbcd3fc8643c04683641fde36146fef73b62646` |
| **Class Hash** | `0x00abc35fe33a082fad61df2a88160f16202d1a08cc338f1954063320063be4d5` |
| **Owner Address** | `0x01734203d1C5B2699B3dbC50223c86EC59E2B79E2d34CBE8363F0dCCdC1E9634` |

---

## 🔗 **Block Explorer Links**

- **Contract Details:** https://starkscan.co/contract/0x05effdcfda86066c72c108e174c55a4f8d1249ba69f80e975d7fc814199a376b
- **Deployment Transaction:** https://starkscan.co/tx/0x0690607f0914a9b03803487fcbbcd3fc8643c04683641fde36146fef73b62646

---

## ⚙️ **Contract Parameters**

| Parameter | Value | Description |
|-----------|--------|-------------|
| **Min Deposit** | 1 STRK | Minimum amount for mixing |
| **Max Deposit** | 100 STRK | Maximum amount for mixing |
| **Mixing Fee** | 0.01% (1 basis point) | Fee charged for mixing service |
| **Min Anonymity Set** | 0 | No anonymity requirement (testing mode) |
| **Min Delay** | 4 seconds | Minimum time before withdrawal |
| **STRK Token** | `0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d` | Mainnet STRK token contract |

---

## 🛠️ **Environment Configuration**

### For `.env.local`:
```bash
MIXER_CONTRACT_ADDRESS=0x05effdcfda86066c72c108e174c55a4f8d1249ba69f80e975d7fc814199a376b
NEXT_PUBLIC_MIXER_CONTRACT_ADDRESS=0x05effdcfda86066c72c108e174c55a4f8d1249ba69f80e975d7fc814199a376b
```

---

## 🔒 **Security Features**

- ✅ **Emergency Withdraw:** Owner can recover all funds if needed
- ✅ **Emergency Pause/Unpause:** Owner can halt operations if required
- ✅ **Access Control:** Owner-only administrative functions
- ✅ **Event Logging:** Complete audit trail of all operations
- ✅ **Input Validation:** Comprehensive parameter validation

---

## 🧪 **Testing Configuration**

This contract is deployed with **ultra-minimal parameters** optimized for testing:

- **Instant Mixing:** 4-second delay allows rapid testing
- **No Anonymity Requirement:** Can withdraw immediately without waiting for other users
- **Low Fee:** 0.01% fee minimizes testing costs
- **Reasonable Limits:** 1-100 STRK range suitable for development

---

## 🚨 **Important Notes**

### For Production Use:
- Consider increasing `min_anonymity_set` for better privacy
- Consider increasing `min_delay` for enhanced security
- Monitor contract operations and set up alerting
- Test thoroughly before processing large amounts

### Emergency Procedures:
- **Emergency Pause:** Call `emergency_pause()` as owner
- **Fund Recovery:** Call `emergency_withdraw(recipient)` as owner
- **Resume Operations:** Call `emergency_unpause()` as owner

---

## 📞 **Contract Interaction Examples**

### Check Contract Status:
```bash
sncast --profile mainnet call --contract-address 0x05effdcfda86066c72c108e174c55a4f8d1249ba69f80e975d7fc814199a376b --function is_paused
```

### Get Total Deposits:
```bash
sncast --profile mainnet call --contract-address 0x05effdcfda86066c72c108e174c55a4f8d1249ba69f80e975d7fc814199a376b --function get_total_deposits
```

### Emergency Pause (Owner Only):
```bash
sncast --profile mainnet invoke --contract-address 0x05effdcfda86066c72c108e174c55a4f8d1249ba69f80e975d7fc814199a376b --function emergency_pause
```

---

## ✅ **Deployment Status**

- [x] Contract deployed successfully
- [x] Environment variables updated  
- [x] Block explorer verification available
- [x] Testing parameters configured
- [x] Emergency functions operational
- [ ] Production testing required
- [ ] Integration with full pipeline needed

---

**🎉 Privacy Mixer is LIVE on Starknet Mainnet!**