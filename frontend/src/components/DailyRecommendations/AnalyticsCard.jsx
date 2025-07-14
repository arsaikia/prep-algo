import React from 'react';
import DesktopAnalyticsCard from './DesktopAnalyticsCard';
import MobileAnalyticsCard from './MobileAnalyticsCard';
import { Container } from './AnalyticsCard.styles';

const AnalyticsCard = ({ analysis, progress, batchInfo }) => {
    if (!analysis && !progress) {
        return null;
    }

    return (
        <Container>
            <DesktopAnalyticsCard
                analysis={analysis}
                progress={progress}
                batchInfo={batchInfo}
            />
            <MobileAnalyticsCard
                analysis={analysis}
                progress={progress}
                batchInfo={batchInfo}
            />
        </Container>
    );
};

export default AnalyticsCard; 