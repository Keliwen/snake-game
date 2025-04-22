import { NextResponse } from 'next/server';

export const runtime = 'edge';

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

async function createTableIfNotExists(): Promise<void> {
  try {
    console.log('Checking/creating player_score table...');
    
    // 首先检查表是否存在
    const checkResponse = await fetch('https://ep-sweet-lake-a4sg94pc-pooler.us-east-1.aws.neon.tech/sql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'neon-connection-string': 'postgresql://neondb_owner:npg_dB4bUwgGRL3S@ep-sweet-lake-a4sg94pc-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require',
      },
      body: JSON.stringify({
        query: `
          SELECT column_name, data_type 
          FROM information_schema.columns 
          WHERE table_name = 'player_score'
        `,
      }),
    });

    const checkData = await checkResponse.json();
    console.log('Current table structure:', checkData);

    // 如果表不存在或结构不正确（少于4个字段），重新创建表
    if (!checkData.rows || checkData.rows.length < 4) {
      console.log('Table structure is incomplete, recreating...');

      // 1. 删除旧表
      const dropResponse = await fetch('https://ep-sweet-lake-a4sg94pc-pooler.us-east-1.aws.neon.tech/sql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'neon-connection-string': 'postgresql://neondb_owner:npg_dB4bUwgGRL3S@ep-sweet-lake-a4sg94pc-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require',
        },
        body: JSON.stringify({
          query: 'DROP TABLE IF EXISTS player_score',
        }),
      });

      const dropData = await dropResponse.json();
      console.log('Drop table response:', dropData);

      // 2. 创建新表
      const createResponse = await fetch('https://ep-sweet-lake-a4sg94pc-pooler.us-east-1.aws.neon.tech/sql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'neon-connection-string': 'postgresql://neondb_owner:npg_dB4bUwgGRL3S@ep-sweet-lake-a4sg94pc-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require',
        },
        body: JSON.stringify({
          query: `
            CREATE TABLE player_score (
              id SERIAL PRIMARY KEY,
              player_name VARCHAR(50) NOT NULL,
              score INTEGER NOT NULL,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
          `,
        }),
      });

      const createData = await createResponse.json();
      console.log('Create table response:', createData);

      if (!createResponse.ok) {
        throw new Error(`Failed to create table: ${JSON.stringify(createData)}`);
      }

      // 3. 创建索引
      const indexResponse = await fetch('https://ep-sweet-lake-a4sg94pc-pooler.us-east-1.aws.neon.tech/sql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'neon-connection-string': 'postgresql://neondb_owner:npg_dB4bUwgGRL3S@ep-sweet-lake-a4sg94pc-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require',
        },
        body: JSON.stringify({
          query: 'CREATE INDEX idx_player_score_score ON player_score(score DESC)',
        }),
      });

      const indexData = await indexResponse.json();
      console.log('Create index response:', indexData);

      // 4. 验证表结构
      const verifyResponse = await fetch('https://ep-sweet-lake-a4sg94pc-pooler.us-east-1.aws.neon.tech/sql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'neon-connection-string': 'postgresql://neondb_owner:npg_dB4bUwgGRL3S@ep-sweet-lake-a4sg94pc-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require',
        },
        body: JSON.stringify({
          query: `
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'player_score'
          `,
        }),
      });

      const verifyData = await verifyResponse.json();
      console.log('Verified table structure:', verifyData);
    }
  } catch (error) {
    console.error('Error in createTableIfNotExists:', error);
    throw error;
  }
}

async function saveScoreWithRetry(playerName: string, score: number, retryCount = 0): Promise<Response> {
  try {
    const response = await fetch('https://ep-sweet-lake-a4sg94pc-pooler.us-east-1.aws.neon.tech/sql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'neon-connection-string': 'postgresql://neondb_owner:npg_dB4bUwgGRL3S@ep-sweet-lake-a4sg94pc-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require',
      },
      body: JSON.stringify({
        query: `
          INSERT INTO player_score (player_name, score) 
          VALUES ($1, $2)
        `,
        params: [playerName, score],
      }),
    });

    if (!response.ok && retryCount < MAX_RETRIES) {
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return saveScoreWithRetry(playerName, score, retryCount + 1);
    }

    return response;
  } catch (error) {
    if (retryCount < MAX_RETRIES) {
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return saveScoreWithRetry(playerName, score, retryCount + 1);
    }
    throw error;
  }
}

export async function POST(request: Request) {
  try {
    // 确保表存在
    await createTableIfNotExists();
    
    const { playerName, score } = await request.json();

    // 数据验证
    if (!playerName || typeof score !== 'number') {
      return NextResponse.json(
        { error: 'Invalid input' },
        { status: 400 }
      );
    }

    if (playerName.length < 2 || playerName.length > 20) {
      return NextResponse.json(
        { error: 'Player name must be between 2 and 20 characters' },
        { status: 400 }
      );
    }

    if (score < 0 || score > 1000) {
      return NextResponse.json(
        { error: 'Score must be between 0 and 1000' },
        { status: 400 }
      );
    }

    console.log('Attempting to save score:', { playerName, score });

    const response = await saveScoreWithRetry(playerName, score);
    const responseData = await response.json();
    console.log('Database raw response:', responseData);

    if (!response.ok) {
      console.error('Database error:', responseData);
      throw new Error(`Database error: ${JSON.stringify(responseData)}`);
    }

    // 检查数据库操作是否成功
    if (responseData && responseData.command === 'INSERT' && responseData.rowCount === 1) {
      return NextResponse.json({ 
        success: true,
        message: 'Score saved successfully'
      });
    } else {
      throw new Error('Failed to save score: Database operation failed');
    }
  } catch (error) {
    console.error('Error saving score:', error);
    return NextResponse.json(
      { 
        error: 'Failed to save score',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// 添加获取排行榜的API
export async function GET() {
  try {
    // 确保表存在
    await createTableIfNotExists();
    
    console.log('Fetching leaderboard data...');
    const response = await fetch('https://ep-sweet-lake-a4sg94pc-pooler.us-east-1.aws.neon.tech/sql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'neon-connection-string': 'postgresql://neondb_owner:npg_dB4bUwgGRL3S@ep-sweet-lake-a4sg94pc-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require',
      },
      body: JSON.stringify({
        query: `
          SELECT player_name, score, created_at 
          FROM player_score 
          ORDER BY score DESC 
          LIMIT 10
        `,
      }),
    });

    console.log('Leaderboard response status:', response.status);
    const responseData = await response.json();
    console.log('Leaderboard raw response data:', responseData);

    if (!response.ok) {
      console.error('Database error:', responseData);
      throw new Error('Failed to fetch leaderboard');
    }

    // 处理数据库返回的数据格式
    let leaderboardData = [];
    if (responseData && responseData.rows) {
      leaderboardData = responseData.rows;
    } else if (Array.isArray(responseData)) {
      leaderboardData = responseData;
    }

    console.log('Processed leaderboard data:', leaderboardData);

    return NextResponse.json(leaderboardData);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard' },
      { status: 500 }
    );
  }
} 