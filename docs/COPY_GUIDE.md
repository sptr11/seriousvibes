# COPY_GUIDE.md

The voice for everything user-facing — page copy, error messages, button labels, tooltips.

Customize this file for your product, then reference it from `CLAUDE.md` so AI agents read it before they write.

## Voice

Pick three adjectives. Make them load-bearing.

Example (Pluck's): **specific, dry, confident**.

- Specific: "Couldn't send the link" beats "Something went wrong."
- Dry: No exclamation points. No "Awesome!", "Great!", "Woohoo!".
- Confident: State the fact, don't soften it. "This will delete 12 forms" not "Are you sure you want to delete these forms?"

## Nine rules

1. **State the fact.** "12 forms deleted." Not "12 forms have been successfully deleted."
2. **One specific thing per sentence.** Cut everything else.
3. **No "AI" in the headline.** If your product needs AI in the headline to sell, the headline is doing the wrong job.
4. **Lowercase nouns.** "dashboard", "form", "workspace" — not "Dashboard", "Form", "Workspace".
5. **No exclamation points.** Ever. Including "Welcome!"
6. **Address one person.** "Your" not "Users'". "You can" not "Teams can".
7. **Don't market features. Sell outcomes.** "Get answers worth reading" beats "AI-powered surveys with smart probing."
8. **Specific examples over abstract benefits.** "Used by SRE teams running blameless postmortems" beats "trusted by teams."
9. **Cut all hedging.** "Mostly", "usually", "sometimes" — pick one stance and own it.

## Banned words

| Banned | Why | Use instead |
|---|---|---|
| "Awesome", "Amazing" | Marketing-speak | Cut it |
| "Best-in-class" | Says nothing | A specific fact |
| "AI-powered", "AI-assisted" | Buzzword | What the product does for the user |
| "Intelligent", "Smart" | Empty | What it actually does |
| "Stakeholders" | Corporate | "The people involved", "your team" |
| "At scale" | Vague | "with 1000+ submissions a month" |
| "Seamlessly" | Filler | Cut it |
| "Leverage" | Stop | "Use" |
| "Robust" | Empty | A specific quality |
| "Effortlessly" | A lie | Cut it |

## Error messages

State what couldn't happen, in user terms.

| Bad | Good |
|---|---|
| "Something went wrong." | "Couldn't save your changes — the title is required." |
| "Error 500." | "Couldn't reach the server. Try again." |
| "Invalid input." | "Email must include @ and a domain." |
| "Operation failed." | "Couldn't delete the workspace — you're the only owner." |

Never: "Oops!", "Whoops!", emoji, or "please try again" without saying why.

## CTAs

The button's text is what happens when you click it.

| Bad | Good |
|---|---|
| "Submit" | "Create form" |
| "Save" | "Save changes" (if there are changes) |
| "Click here" | The thing it does |
| "Get started" | "Create your first form" |

If the button does nothing reversible, use a serious verb: "Delete forever", not "Confirm."

## Headlines

The headline names the user's specific problem and your specific answer. In one breath.

- Bad: "The future of forms is here."
- Better: "Forms that interview your respondents."
- Best: depends on your audience.

If your headline could be on any product's site, it's not your headline.

## Microcopy

- **Empty states.** Tell the user what to do, with one button. "No forms yet. Create your first." not "You don't have any forms!"
- **Tooltips.** Explain *why*, not *what*. Hovering "Publish" should reveal "Locks the fields so submissions stay consistent." Not "Publishes the form."
- **Confirmation dialogs.** Name the thing being changed and the consequence. "Delete `Sprint Retro Q4`? Its 47 responses will be removed."

## When using AI to write copy

The AI will produce mush by default. Force it through this guide:

- Reject any sentence with a banned word.
- Reject any sentence that could apply to a different product.
- Reject any headline without a specific noun.
- Reject any CTA whose text doesn't describe the action.

This is the single highest-ROI use of `CLAUDE.md` — pointing the AI at this guide before it writes.

## Quick checklist

Before shipping any user-facing string:

- [ ] No banned words.
- [ ] Specific noun, specific verb.
- [ ] States the fact (no hedging, no exclamation).
- [ ] Could *only* be on this product's site (not generic).
- [ ] If it's an error: says what couldn't happen and why.
- [ ] If it's a CTA: describes the action that will occur.
