import { maxDescriptionLength, maxTransactionAmount, minTransactionAmount } from 'api/schemas';
import { content, format } from './content/content';
import { currencyFormatter } from './constants';

type Issue = { path: PropertyKey[]; code: string };

// Localizes schema issues by field and issue code instead of showing the schema's English text
export function getIssueMessage({ path, code }: Issue) {
  const messages = content.validation;
  switch (path[0]) {
    case 'date':
      return messages.date.invalid;
    case 'amount':
      if (code === 'too_small') {
        return format(messages.amount.min, { min: currencyFormatter.format(minTransactionAmount) });
      }
      if (code === 'too_big') {
        return format(messages.amount.max, { max: currencyFormatter.format(maxTransactionAmount) });
      }
      return messages.amount.invalid;
    case 'type':
      return messages.type.invalid;
    case 'description':
      if (code === 'too_big') return format(messages.description.max, { max: maxDescriptionLength });
      return messages.description.required;
    default:
      return messages.fallback;
  }
}
