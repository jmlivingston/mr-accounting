import { dateRuleReasons, maxDescriptionLength, maxTransactionAmount, minTransactionAmount } from 'api/schemas';
import { content, format } from './content/content';
import { currencyFormatter } from './constants';

type Issue = { path: PropertyKey[]; code: string; params?: Record<string, unknown> };

export function getIssueMessage({ path, code, params }: Issue) {
  const messages = content.validation;
  switch (path[0]) {
    case 'date':
      if (params?.reason === dateRuleReasons.future) return messages.date.future;
      if (params?.reason === dateRuleReasons.tooOld) return messages.date.tooOld;
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
