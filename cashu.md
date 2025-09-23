The Cashu Protocol
Cashu is an ecash protocol built for Bitcoin. It is an open protocol which means that everyone can write their own software to interact with other Cashu apps. Applications that follow the specifications will be compatible with the rest of the ecosystem.

NUTs
Cashu NUTs (Notation, Usage, and Terminology) specify the Cashu protocol and can be found here.

BDHKE
The Blind Diffie-Hellmann Key Exchange (BDHKE) is the basic cryptographic scheme used in the Cashu protocol to sign and redeem ecash tokens. There are three actors in this model:

Sending user: Alice
Receiving user: Carol
Mint: Bob
Bob (mint)
k private key of mint (one for each amount)
K public key of mint
Q promise (blinded signature)
Alice (user)
x random string (secret message), corresponds to point Y on curve
r private key (blinding factor)
T blinded message
Z proof (unblinded signature)
Blind Diffie-Hellmann key exchange (BDHKE)
Mint Bob publishes public key K = kG
Alice picks secret x and computes Y = hash_to_curve(x)
Alice sends to Bob: B_ = Y + rG with r being a random blindind factor (blinding)
Bob sends back to Alice blinded key: C_ = kB_ (these two steps are the DH key exchange) (signing)
Alice can calculate the unblinded key as C_ - rK = kY + krG - krG = kY = C (unblinding)
Alice can take the pair (x, C) as a token and can send it to Carol.
Carol can send (x, C) to Bob who then checks that k*hash_to_curve(x) == C (verification), and if so treats it as a valid spend of a token, adding x to the list of spent secrets.


Usage
Go to the docs for detailed usage, or have a look at the integration tests for examples on how to implement a wallet.

Install
npm i @cashu/cashu-ts
Logging
By default, cashu-ts does not log to the console. If you want to enable logging for debugging purposes, you can set the logger option when creating a wallet or mint. A ConsoleLogger is provided, or you can wrap your existing logger to conform to the Logger interface:

import { CashuMint, CashuWallet, ConsoleLogger, LogLevel } from '@cashu/cashu-ts';
const mintUrl = 'http://localhost:3338';
const mintLogger = new ConsoleLogger(LogLevel.ERROR);
const mint = new CashuMint(mintUrl, undefined, { logger: mintLogger }); // Enable logging for the mint
const walletLogger = new ConsoleLogger(LogLevel.DEBUG);
const wallet = new CashuWallet(mint, { logger: walletLogger }); // Enable logging for the wallet
Examples
Mint tokens
import { CashuMint, CashuWallet, MintQuoteState } from '@cashu/cashu-ts';
const mintUrl = 'http://localhost:3338';
const mint = new CashuMint(mintUrl);
const wallet = new CashuWallet(mint);
await wallet.loadMint(); // persist wallet.keys and wallet.keysets to avoid calling loadMint() in the future
const mintQuote = await wallet.createMintQuote(64);
// pay the invoice here before you continue...
const mintQuoteChecked = await wallet.checkMintQuote(mintQuote.quote);
if (mintQuoteChecked.state == MintQuoteState.PAID) {
	const proofs = await wallet.mintProofs(64, mintQuote.quote);
}
Melt tokens
import { CashuMint, CashuWallet } from '@cashu/cashu-ts';
const mintUrl = 'http://localhost:3338'; // the mint URL
const mint = new CashuMint(mintUrl);
const wallet = new CashuWallet(mint); // load the keysets of the mint

const invoice = 'lnbc......'; // Lightning invoice to pay
const meltQuote = await wallet.createMeltQuote(invoice);
const amountToSend = meltQuote.amount + meltQuote.fee_reserve;

// CashuWallet.send performs coin selection and swaps the proofs with the mint
// if no appropriate amount can be selected offline. We must include potential
// ecash fees that the mint might require to melt the resulting proofsToSend later.
const { keep: proofsToKeep, send: proofsToSend } = await wallet.send(amountToSend, proofs, {
	includeFees: true,
});
// store proofsToKeep in wallet ..

const meltResponse = await wallet.meltProofs(meltQuote, proofsToSend);
// store meltResponse.change in wallet ..
Create a token and receive it
// we assume that `wallet` already minted `proofs`, as above
const { keep, send } = await wallet.send(32, proofs);
const token = getEncodedTokenV4({ mint: mintUrl, proofs: send });
console.log(token);

const wallet2 = new CashuWallet(mint); // receiving wallet
const receiveProofs = await wallet2.receive(token);
Get token data
try {
	const decodedToken = getDecodedToken(token);
	console.log(decodedToken); // { mint: "https://mint.0xchat.com", unit: "sat", proofs: [...] }
} catch (_) {
	console.log('Invalid token');
}
BOLT12 (Reusable Offers)
BOLT12 enables reusable Lightning offers that can be paid multiple times, unlike BOLT11 invoices which are single-use. Key differences:

Reusable: Same offer can receive multiple payments
Amount flexibility: Offers can be amountless (payer chooses amount)
// Create reusable BOLT12 offer
const bolt12Quote = await wallet.createMintQuoteBolt12(bytesToHex(pubkey), {
	amount: 1000, // Optional: omit to create an amountless offer
	description: 'My reusable offer', // The mint must signal in their settings that offers with a description are supported
});

// Pay a BOLT12 offer
const meltQuote = await wallet.createMeltQuoteBolt12(offer, 1000000); // amount in msat
const { keep, send } = await wallet.send(meltQuote.amount + meltQuote.fee_reserve, proofs);
const { change } = await wallet.meltProofsBolt12(meltQuote, send);

// Mint from accumulated BOLT12 payments
const updatedQuote = await wallet.checkMintQuoteBolt12(bolt12Quote.quote);
const availableAmount = updatedQuote.amount_paid - updatedQuote.amount_issued;
if (availableAmount > 0) {
	const newProofs = await wallet.mintProofsBolt12(
		availableAmount,
		updatedQuote,
		bytesToHex(privateKey),
	);
}