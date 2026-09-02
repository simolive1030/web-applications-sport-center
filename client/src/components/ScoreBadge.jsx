import { OverlayTrigger, Tooltip } from 'react-bootstrap';

/** Shows the personal score and the current authentication level. */
function ScoreBadge({ score, isTotp }) {
  const negative = score < 0;

  const tip = negative
    ? 'With a negative score you can only book the minimum mandatory equipment.'
    : 'Score 0 — full booking rights.';

  return (
    <OverlayTrigger placement="bottom" overlay={<Tooltip>{tip}</Tooltip>}>
      <span className="gf-chip">
        <span className={negative ? 'gf-score is-negative' : 'gf-score'}>
          <i
            className={
              negative
                ? 'bi bi-exclamation-triangle'
                : 'bi bi-award'
            }
            aria-hidden="true"
          />
          Score {score}
        </span>

        {isTotp && (
          <>
            <span className="gf-chip-separator" aria-hidden="true" />
            <span className="gf-totp-status" title="Two-factor authenticated session">
              <i className="bi bi-shield-check" aria-hidden="true" />
              2FA
            </span>
          </>
        )}
      </span>
    </OverlayTrigger>
  );
}

export default ScoreBadge;
