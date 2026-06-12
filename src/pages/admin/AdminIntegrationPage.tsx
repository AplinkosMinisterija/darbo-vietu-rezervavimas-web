import { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';
import { adminApi, type SharePointStatus } from '../../api/admin';
import { adminErrorMessage } from '../../lib/adminErrorMessages';
import { useToast } from '../../components/Toast';
import { PageHeader, PageTitle, Muted } from './shared';

/**
 * SharePoint integracijos valdymas. Vienas jungiklis — įjungti/išjungti
 * savaitinį automatinį darbo vietų rezervavimo cron'ą (kas sekmadienį 20:00
 * rezervuoja vietas iš biuro dirbantiems darbuotojams). Būsena saugoma BE
 * `settings` lentelėje, tad išlieka po restart'ų. Išjungus, cron'as vis dar
 * „suveikia", bet nieko nedaro.
 */
export default function AdminIntegrationPage() {
  const toast = useToast();
  const [status, setStatus] = useState<SharePointStatus | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setStatus(await adminApi.sharepoint.status());
    } catch {
      setLoadError(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggle() {
    if (!status || saving) return;
    const next = !status.enabled;
    setSaving(true);
    try {
      const updated = await adminApi.sharepoint.setEnabled(next);
      setStatus(updated);
      toast.success(
        next ? 'Automatinis rezervavimas įjungtas' : 'Automatinis rezervavimas išjungtas',
      );
    } catch (err) {
      toast.error(adminErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Wrapper>
      <PageHeader>
        <PageTitle>Integracijos</PageTitle>
      </PageHeader>

      {loadError ? (
        <Muted>Nepavyko užkrauti integracijos būsenos.</Muted>
      ) : !status ? (
        <Muted>Kraunama…</Muted>
      ) : (
        <Card>
          <CardHead>
            <div>
              <CardTitle>SharePoint — automatinis rezervavimas</CardTitle>
              <Muted>
                Kas sekmadienį 20:00 sistema automatiškai rezervuoja darbo vietas ateinančiai
                savaitei darbuotojams, kurie pažymėti dirbantys vien tik iš ministerijos.
              </Muted>
            </div>
            <Switch
              type="button"
              role="switch"
              aria-checked={status.enabled}
              aria-label="Automatinis savaitinis rezervavimas"
              $on={status.enabled}
              disabled={saving}
              onClick={() => void toggle()}
            >
              <Knob $on={status.enabled} />
            </Switch>
          </CardHead>

          <StateRow>
            <StateBadge $on={status.enabled}>
              {status.enabled ? 'Įjungta' : 'Išjungta'}
            </StateBadge>
            {!status.configured && (
              <ConfigNote>
                ⚠️ SharePoint nesukonfigūruotas šioje aplinkoje (SHAREPOINT_* nenustatyti) — net
                įjungus, automatinis rezervavimas neveiks, kol nebus pridėti prieigos duomenys.
              </ConfigNote>
            )}
          </StateRow>
        </Card>
      )}
    </Wrapper>
  );
}

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.ui.spacing.lg};
`;

const Card = styled.section`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.ui.radius};
  padding: ${({ theme }) => theme.ui.spacing.md};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.ui.spacing.md};
`;

const CardHead = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: ${({ theme }) => theme.ui.spacing.lg};
`;

const CardTitle = styled.h3`
  margin: 0 0 6px 0;
  font-size: 16px;
  color: ${({ theme }) => theme.colors.navy};
`;

const Switch = styled.button<{ $on: boolean }>`
  flex-shrink: 0;
  width: 52px;
  height: 30px;
  border-radius: 999px;
  border: none;
  padding: 3px;
  cursor: pointer;
  background: ${({ $on, theme }) => ($on ? theme.colors.brand : theme.colors.border)};
  transition: background 0.15s ease;
  display: flex;
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const Knob = styled.span<{ $on: boolean }>`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #fff;
  transition: transform 0.15s ease;
  transform: translateX(${({ $on }) => ($on ? '22px' : '0')});
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
`;

const StateRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.ui.spacing.md};
  flex-wrap: wrap;
`;

const StateBadge = styled.span<{ $on: boolean }>`
  display: inline-block;
  padding: 2px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  background: ${({ $on, theme }) => ($on ? theme.colors.brand : theme.colors.bg)};
  color: ${({ $on, theme }) => ($on ? '#fff' : theme.colors.text)};
  border: 1px solid ${({ $on, theme }) => ($on ? theme.colors.brand : theme.colors.border)};
`;

const ConfigNote = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.warning};
`;
