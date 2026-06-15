import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { adminApi } from '../../api/admin';
import type { User } from '../../types';

interface Props {
  /** Šiuo metu pasirinktas vartotojas (chip) arba null (rodom paiešką). */
  selected: User | null;
  onSelect: (user: User) => void;
  onClear: () => void;
  disabled?: boolean;
  placeholder?: string;
}

/**
 * Debounced (300ms) vartotojų paieška per /users?q=… su rezultatų dropdown'u.
 * Pasirinkus — rodomas „chip" su „keisti" mygtuku. Ištraukta iš
 * AssignReservationModal, kad to paties picker'io nereikėtų triplinti
 * (AdminManagersPage + ManagerPage members + assign modal).
 */
export default function UserSearchPicker({
  selected,
  onSelect,
  onClear,
  disabled,
  placeholder = 'Ieškoti pagal vardą ar el. paštą…',
}: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
    if (selected || query.trim().length === 0) {
      setResults([]);
      return;
    }
    debounceRef.current = window.setTimeout(() => {
      setSearching(true);
      void adminApi.users
        .list({ q: query.trim(), limit: 6 })
        .then((r) => setResults(r.items))
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 300);
    return () => {
      if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
    };
  }, [query, selected]);

  function pick(u: User) {
    onSelect(u);
    setResults([]);
    setQuery('');
  }

  if (selected) {
    return (
      <Chip>
        <span>
          {selected.displayName}
          <ChipSub> · {selected.email}</ChipSub>
        </span>
        <ChipClear
          type="button"
          disabled={disabled}
          onClick={() => {
            onClear();
            setQuery('');
          }}
        >
          keisti
        </ChipClear>
      </Chip>
    );
  }

  return (
    <UserSearchWrap>
      <FieldInput
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        disabled={disabled}
      />
      {(results.length > 0 || searching) && (
        <Results>
          {searching && results.length === 0 ? (
            <ResultEmpty>Ieškoma…</ResultEmpty>
          ) : (
            results.map((u) => (
              <ResultItem key={u.id} type="button" onClick={() => pick(u)}>
                <strong>{u.displayName}</strong>
                <ResultEmail>{u.email}</ResultEmail>
              </ResultItem>
            ))
          )}
        </Results>
      )}
    </UserSearchWrap>
  );
}

const FieldInput = styled.input`
  padding: 8px 10px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.ui.radiusSm};
  font-size: 14px;
  width: 100%;
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.brand};
  }
`;

const UserSearchWrap = styled.div`
  position: relative;
`;

const Results = styled.div`
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  z-index: 10;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.ui.radiusSm};
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);
  max-height: 220px;
  overflow-y: auto;
`;

const ResultItem = styled.button`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  width: 100%;
  padding: 8px 10px;
  background: transparent;
  border: none;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  text-align: left;
  cursor: pointer;
  font-size: 14px;
  &:last-child {
    border-bottom: none;
  }
  &:hover {
    background: ${({ theme }) => theme.colors.bg};
  }
`;

const ResultEmail = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.textMute};
`;

const ResultEmpty = styled.div`
  padding: 8px 10px;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.textMute};
`;

const Chip = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 10px;
  border: 1px solid ${({ theme }) => theme.colors.brand};
  border-radius: ${({ theme }) => theme.ui.radiusSm};
  font-size: 14px;
  background: ${({ theme }) => theme.colors.bg};
`;

const ChipSub = styled.span`
  color: ${({ theme }) => theme.colors.textMute};
  font-size: 12px;
`;

const ChipClear = styled.button`
  flex-shrink: 0;
  background: transparent;
  border: none;
  color: ${({ theme }) => theme.colors.brand};
  font-size: 13px;
  cursor: pointer;
  text-decoration: underline;
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;
