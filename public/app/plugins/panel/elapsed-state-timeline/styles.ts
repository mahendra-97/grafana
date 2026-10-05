import { css } from '@emotion/css';

export const containerStyles = css({
  display: 'flex',
  flexDirection: 'column',
});

export const timeMarker = css({
  position: 'absolute',
  top: 22,
  bottom: 31,
  width: '1px',
  background: 'red',
  zIndex: 100,
  cursor: 'ew-resize',
  touchAction: 'none',
});

export const timeMarkerPointer = css({
  position: 'absolute',
  top: '-7px',
  left: '-6px',
  width: 0,
  height: 0,
  borderLeft: '7px solid transparent',
  borderRight: '7px solid transparent',
  borderTop: '8px solid red',
  zIndex: 101,
  cursor: 'ew-resize',
  touchAction: 'none',
});

export const checkDurationButton = css({
  width: '25%',
  background: '#3D71D9',
  fontSize: '1rem !important',
  fontWeight: '500 !important',
  border: 'none',
  borderRadius: '6px',
  height: '33px',
  color: 'white',
  letterSpacing: '0.5px',
  pointerEvents: 'auto',
});

export const elaspsedStateControlsStyles = css({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  gap: '8px',
  padding: '0px 8px',
  width: '70%',
  pointerEvents: 'auto',
  height: '44px',
});

export const elapsedStateControlsContainer = css({
  display: 'flex',
  alignItems: 'center',
  margin: '-3.2rem 0px 0px 3rem',
  pointerEvents: 'none',
  gap: '8px',
  height: '44px',
});

export const timeDifference = css({
  display: 'flex',
  alignItems: 'center',
  width: '100%',
  marginLeft: '15px',
  height: '33px'
});

export const menuItemFieldcloseIcon = css({
  marginLeft: 'auto',
  marginRight: '15px',
  padding: '2px 12px',
  borderLeft: '1px solid rgba(255, 255, 255, 0.3)',
  cursor: 'pointer',
});