import React, { useEffect } from 'react'
import { Translate } from 'react-localize-redux'
import { useDispatch, useSelector } from 'react-redux'
import PageContainer from '../common/PageContainer';
import Container from '../common/styled/Container.css'
import RecoveryContainer from './Recovery/RecoveryContainer'
import BalanceContainer from './balances/BalanceContainer'
import HardwareDevices from './hardware_devices/HardwareDevices'
import TwoFactorAuth from './two_factor/TwoFactorAuth'
import { LOADING, NOT_FOUND, useAccount } from '../../hooks/allAccounts'
import { getLedgerKey, checkCanEnableTwoFactor, getAccessKeys, redirectTo, getProfileBalance, transferAllFromLockup, loadRecoveryMethods } from '../../actions/account'
import styled from 'styled-components'
import LockupAvailTransfer from './balances/LockupAvailTransfer'
import UserIcon from '../svg/UserIcon'
import ShieldIcon from '../svg/ShieldIcon'
import LockIcon from '../svg/LockIcon'
import { actionsPending } from '../../utils/alerts'
import BN from 'bn.js'
import SkeletonLoading from '../common/SkeletonLoading';

const StyledContainer = styled(Container)`

    @media (min-width: 992px) {
        .split {
            display: flex;
        }

        .left {
            flex: 1.5;
            margin-right: 50px;
        }

        .right {
            flex: 1;
        }
    }

    @media (max-width: 991px) {
        .right {
            margin-top: 50px;
        }
    }

    h2 {
        font-weight: 900 !important;
        font-size: 24px !important;
        margin: 10px 0;
        text-align: left !important;
        line-height: 140% !important;
        display: flex;
        align-items: center;

        svg {
            margin-right: 15px;

            &.user-icon {
                margin-right: 10px;
            }

            .background {
                display: none;
            }
        }
    }

    .left, .right {
        .animation-wrapper {
            border-radius: 8px;
            overflow: hidden;
        }
    }

    .left {
        @media (min-width: 992px) {
            h2 {
                margin-left: -20px;
            }
        }

        .animation-wrapper {
            margin-top: 50px;

            :last-of-type {
                margin-top: 30px;
            }
        }
    }

    .right {
        > h4 {
            margin: 50px 0 20px 0;
        }

        .recovery-option,
        .animation-wrapper {
            margin-top: 15px;
        }
    }

    hr {
        border: 1px solid #F0F0F0;
        margin: 50px 0 40px 0;
    }

    .sub-heading {
        margin: 20px 0;
    }
`

export function Profile({ match }) {
    const { has2fa, profileBalance } = useSelector(({ account }) => account)
    const { mainLoader } = useSelector(({ status }) => status)
    const loginAccountId = useSelector(state => state.account.accountId)
    const recoveryMethods = useSelector(({ recoveryMethods }) => recoveryMethods);
    const accountIdFromUrl = match.params.accountId
    const accountId = accountIdFromUrl || loginAccountId
    const isOwner = accountId === loginAccountId
    const account = useAccount(accountId)
    const dispatch = useDispatch();
    const userRecoveryMethods = recoveryMethods[account.accountId]
    const twoFactor = has2fa && userRecoveryMethods && userRecoveryMethods.filter(m => m.kind.includes('2fa'))[0]
    const balanceLoader = actionsPending('GET_PROFILE_BALANCE') && !profileBalance
    const recoveryLoader = actionsPending('LOAD_RECOVERY_METHODS')

    useEffect(() => {
        dispatch(getProfileBalance(accountId))
        dispatch(loadRecoveryMethods())

        if (accountIdFromUrl && accountIdFromUrl !== accountIdFromUrl.toLowerCase()) {
            dispatch(redirectTo(`/profile/${accountIdFromUrl.toLowerCase()}`))
        }

        if (isOwner) {
            dispatch(getAccessKeys(accountId))
            dispatch(getLedgerKey())
            dispatch(checkCanEnableTwoFactor(account))
        }
    }, []);

    if (account.__status === LOADING) {
        return <PageContainer title={<Translate id='profile.pageTitle.loading' />} />
    }

    if (account.__status === NOT_FOUND) {
        return <PageContainer title={<Translate id='profile.pageTitle.notFound' data={{ accountId }} />} />
    }

    const handleTransferFromLockup = async () => {
        await dispatch(transferAllFromLockup())
        await dispatch(getProfileBalance(accountId))
    }

    return (
        <StyledContainer>
            {isOwner && profileBalance && profileBalance.lockupIdExists && !new BN(profileBalance.lockupBalance.unlocked.availableToTransfer).isZero() &&
                <LockupAvailTransfer
                    available={profileBalance.lockupBalance.unlocked.availableToTransfer || '0'}
                    onTransfer={handleTransferFromLockup}
                    sending={actionsPending('TRANSFER_ALL_FROM_LOCKUP')}
                />
            }
            <div className='split'>
                <div className='left'>
                    <h2><UserIcon/><Translate id='profile.pageTitle.default'/></h2>
                    {!balanceLoader ? (
                        <BalanceContainer
                            account={account}
                            profileBalance={profileBalance}
                        />
                    ) : (
                        <SkeletonLoading
                            height='323px'
                            show={balanceLoader}
                            number={2}
                        />
                    )}
                </div>
                {isOwner &&
                    <div className='right'>
                        <h2><ShieldIcon/><Translate id='profile.security.title'/></h2>
                        <h4><Translate id='profile.security.mostSecure'/></h4>
                        {!twoFactor && <HardwareDevices recoveryMethods={userRecoveryMethods}/>}
                        <RecoveryContainer type='phrase' recoveryMethods={userRecoveryMethods}/>
                        <h4><Translate id='profile.security.lessSecure'/></h4>
                        <RecoveryContainer type='email' recoveryMethods={userRecoveryMethods}/>
                        <RecoveryContainer type='phone' recoveryMethods={userRecoveryMethods}/>
                        {!account.ledgerKey &&
                            <>
                                <hr/>
                                <h2><LockIcon/><Translate id='profile.twoFactor'/></h2>
                                {!recoveryLoader ? (
                                    <>
                                        <div className='sub-heading'><Translate id='profile.twoFactorDesc'/></div>
                                        {/* TODO: Also check recovery methods in DB for Ledger */}
                                        <TwoFactorAuth twoFactor={twoFactor}/>
                                    </>
                                ) : (
                                    <SkeletonLoading
                                        height='80px'
                                        show={recoveryLoader}
                                    />
                                )}
                            </>
                        }
                    </div>
                }
            </div>
        </StyledContainer>
    )
}
