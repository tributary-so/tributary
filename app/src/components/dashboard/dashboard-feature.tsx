export default function DashboardFeature() {
  return (
    <div 
      style={{
        width: '100%',
        backgroundColor: '#fff',
        fontFamily: 'var(--font-primary)',
        paddingTop: '40px',
        paddingBottom: '40px',
        flex: 1,
      }}
    >
      <div className="max-w-[1440px] mx-auto px-[40px]">
        <div 
          className="border-r border-l border-[var(--color-primary)] flex items-center justify-center"
          style={{
            padding: '32px',
            minHeight: '500px',
          }}
        >
          <div 
            style={{
              fontSize: '32px',
              lineHeight: '38px',
              fontFamily: 'var(--font-secondary)',
              textAlign: 'center',
              maxWidth: '372px',
            }}
          >
            <p style={{ margin: 0 }}>Accept and manage crypto subscriptions</p>
            <p style={{ margin: 0 }}>in minutes</p>
          </div>
        </div>
      </div>
    </div>
  )
}