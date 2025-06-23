import React from 'react';
import styled from 'styled-components';
import { useTheme } from '../../hooks/useTheme';

const FooterContainer = styled.footer`
    background: ${({ theme }) => theme.colors.backgroundSecondary};
    border-top: 1px solid ${({ theme }) => theme.colors.border};
    padding: 24px 0;
    margin-top: auto;
`;

const FooterContent = styled.div`
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 24px;
    
    @media (max-width: 768px) {
        flex-direction: column;
        gap: 16px;
        text-align: center;
    }
`;

const Copyright = styled.div`
    color: ${({ theme }) => theme.colors.textTertiary};
    font-size: 14px;
    display: flex;
    align-items: center;
    gap: 8px;
    
    .brand {
        color: ${({ theme }) => theme.colors.primary};
        font-weight: 600;
    }
`;

const ThemeToggle = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
`;

const ThemeLabel = styled.span`
    color: ${({ theme }) => theme.colors.textTertiary};
    font-size: 13px;
    font-weight: 500;
`;

const ThemeSelector = styled.div`
    display: flex;
    background: ${({ theme }) => theme.colors.backgroundSecondary};
    border: 1px solid ${({ theme }) => theme.colors.border};
    border-radius: 6px;
    overflow: hidden;
`;

const ThemeOption = styled.button`
    padding: 6px 12px;
    border: none;
    background: ${({ theme, $active }) =>
        $active ? theme.colors.backgroundTertiary : 'transparent'
    };
    color: ${({ theme, $active }) =>
        $active ? theme.colors.text : theme.colors.textTertiary
    };
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    opacity: ${({ $active }) => $active ? 1 : 0.7};
    
    &:hover {
        background: ${({ theme, $active }) =>
        $active ? theme.colors.backgroundTertiary : theme.colors.backgroundSecondary
    };
        color: ${({ theme }) => theme.colors.text};
        opacity: 1;
    }
    
    &:not(:last-child) {
        border-right: 1px solid ${({ theme }) => theme.colors.border};
    }
`;

const Footer = () => {
    const { colorScheme, setColorScheme } = useTheme();
    const currentYear = new Date().getFullYear();

    return (
        <FooterContainer>
            <FooterContent>
                <Copyright>
                    <span>© {currentYear}</span>
                    <span className="brand">RemindMe</span>
                    <span>• All rights reserved</span>
                </Copyright>

                <ThemeToggle>
                    <ThemeLabel>🎨</ThemeLabel>
                    <ThemeSelector>
                        <ThemeOption
                            $active={colorScheme === 'original'}
                            onClick={() => setColorScheme('original')}
                        >
                            Original
                        </ThemeOption>
                        <ThemeOption
                            $active={colorScheme === 'complementary'}
                            onClick={() => setColorScheme('complementary')}
                        >
                            Complementary
                        </ThemeOption>
                        <ThemeOption
                            $active={colorScheme === 'triadic'}
                            onClick={() => setColorScheme('triadic')}
                        >
                            Triadic
                        </ThemeOption>
                    </ThemeSelector>
                </ThemeToggle>
            </FooterContent>
        </FooterContainer>
    );
};

export default Footer; 